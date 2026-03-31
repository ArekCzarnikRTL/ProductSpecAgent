#!/usr/bin/env bash
# =============================================================================
# Test-Script: Vollständiger Agent-Flow durch alle Wizard-Steps
# Testet: Projekt-Erstellung, Wizard-Steps, Chat, Decisions, Clarifications, Tasks
#
# Strategie:
# - Wizard-Steps liefern Daten UND koennen Decisions/Clarifications ausloesen
# - Chat-Endpoint wird zusaetzlich genutzt um gezielt Decisions/Clarifications
#   zu provozieren, falls der Wizard-Step keine erzeugt hat
# =============================================================================

set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:8080}"
API="$BASE_URL/api/v1"
LOCALE="de"
TIMEOUT="${CURL_TIMEOUT:-120}"

# Farben
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

# Zaehler
step_nr=0
TOTAL_DECISIONS=0
TOTAL_CLARIFICATIONS=0

header() {
  step_nr=$((step_nr + 1))
  echo ""
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}  Step $step_nr: $1${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

check_response() {
  local response="$1"
  local label="$2"
  if echo "$response" | jq -e . > /dev/null 2>&1; then
    echo -e "${GREEN}  OK $label${NC}"
  else
    echo -e "${RED}  FEHLER $label${NC}"
    echo "  $response"
    exit 1
  fi
}

print_field() {
  local json="$1"
  local field="$2"
  local label="$3"
  local val
  val=$(echo "$json" | jq -r "$field // \"(leer)\"")
  echo -e "  ${YELLOW}$label:${NC} $val"
}

# Hilfsfunktion: Decision anzeigen und resolven
handle_decision() {
  local dec_id="$1"
  local source="$2"
  TOTAL_DECISIONS=$((TOTAL_DECISIONS + 1))
  echo -e "  ${CYAN}>>> Decision aus $source gefunden: $dec_id${NC}"

  local dec_resp
  dec_resp=$(curl -s --max-time "$TIMEOUT" "$API/projects/$PROJECT_ID/decisions/$dec_id")
  check_response "$dec_resp" "Decision geladen"
  print_field "$dec_resp" '.title' "Titel"
  print_field "$dec_resp" '.status' "Status"

  echo -e "  ${YELLOW}Optionen:${NC}"
  echo "$dec_resp" | jq -r '.options[] | "    [\(.id)] \(.label) (empfohlen: \(.recommended))"'

  # Empfohlene Option waehlen, sonst erste
  local chosen_opt
  chosen_opt=$(echo "$dec_resp" | jq -r '(.options[] | select(.recommended == true) | .id) // .options[0].id')
  echo -e "  ${YELLOW}Gewaehlt:${NC} $chosen_opt"

  local resolve_resp
  resolve_resp=$(curl -s --max-time "$TIMEOUT" -X POST "$API/projects/$PROJECT_ID/decisions/$dec_id/resolve" \
    -H "Content-Type: application/json" \
    -d "{\"chosenOptionId\": \"$chosen_opt\", \"rationale\": \"Automatischer Test – empfohlene Option gewaehlt\"}")

  check_response "$resolve_resp" "Decision resolved"
  print_field "$resolve_resp" '.status' "Neuer Status"
}

# Hilfsfunktion: Clarification anzeigen und beantworten
handle_clarification() {
  local clar_id="$1"
  local source="$2"
  local answer="$3"
  TOTAL_CLARIFICATIONS=$((TOTAL_CLARIFICATIONS + 1))
  echo -e "  ${CYAN}>>> Clarification aus $source gefunden: $clar_id${NC}"

  local clar_resp
  clar_resp=$(curl -s --max-time "$TIMEOUT" "$API/projects/$PROJECT_ID/clarifications/$clar_id")
  check_response "$clar_resp" "Clarification geladen"
  print_field "$clar_resp" '.question' "Frage"
  print_field "$clar_resp" '.reason' "Grund"
  print_field "$clar_resp" '.status' "Status"

  local answer_resp
  answer_resp=$(curl -s --max-time "$TIMEOUT" -X POST "$API/projects/$PROJECT_ID/clarifications/$clar_id/answer" \
    -H "Content-Type: application/json" \
    -d "{\"answer\": \"$answer\"}")

  check_response "$answer_resp" "Clarification beantwortet"
  print_field "$answer_resp" '.status' "Neuer Status"
}

# Hilfsfunktion: Wizard-Step mit Decision/Clarification-Handling
run_wizard_step() {
  local step_name="$1"
  local fields_json="$2"

  local resp
  resp=$(curl -s --max-time "$TIMEOUT" -X POST "$API/projects/$PROJECT_ID/agent/wizard-step-complete" \
    -H "Content-Type: application/json" \
    -d "{\"step\": \"$step_name\", \"fields\": $fields_json, \"locale\": \"$LOCALE\"}")

  check_response "$resp" "$step_name verarbeitet"
  print_field "$resp" '.nextStep' "Next Step"
  print_field "$resp" '.decisionId' "Decision-ID"
  print_field "$resp" '.clarificationId' "Clarification-ID"

  echo -e "  ${YELLOW}Agent-Antwort:${NC}"
  echo "$resp" | jq -r '.message' | sed 's/^/  | /'

  local dec_id clar_id
  dec_id=$(echo "$resp" | jq -r '.decisionId // empty')
  clar_id=$(echo "$resp" | jq -r '.clarificationId // empty')

  [ -n "$dec_id" ] && handle_decision "$dec_id" "Wizard:$step_name"
  [ -n "$clar_id" ] && handle_clarification "$clar_id" "Wizard:$step_name" "Automatische Antwort fuer Testlauf."

  # Exportieren wir die Response fuer spaetere Nutzung
  LAST_WIZARD_RESP="$resp"
}

# Hilfsfunktion: Chat-Nachricht senden mit Decision/Clarification-Handling
send_chat() {
  local message="$1"
  local default_answer="${2:-Automatische Antwort fuer Testlauf.}"

  local resp
  resp=$(curl -s --max-time "$TIMEOUT" -X POST "$API/projects/$PROJECT_ID/agent/chat" \
    -H "Content-Type: application/json" \
    -d "{\"message\": \"$message\", \"locale\": \"$LOCALE\"}")

  check_response "$resp" "Chat-Antwort erhalten"
  print_field "$resp" '.currentStep' "Current Step"
  print_field "$resp" '.decisionId' "Decision-ID"
  print_field "$resp" '.clarificationId' "Clarification-ID"

  echo -e "  ${YELLOW}Agent-Antwort:${NC}"
  echo "$resp" | jq -r '.message' | sed 's/^/  | /'

  local dec_id clar_id
  dec_id=$(echo "$resp" | jq -r '.decisionId // empty')
  clar_id=$(echo "$resp" | jq -r '.clarificationId // empty')

  [ -n "$dec_id" ] && handle_decision "$dec_id" "Chat"
  [ -n "$clar_id" ] && handle_clarification "$clar_id" "Chat" "$default_answer"

  LAST_CHAT_RESP="$resp"
}

# =============================================================================
# 1. Projekt erstellen
# =============================================================================
header "Projekt erstellen"

PROJECT_RESP=$(curl -s --max-time "$TIMEOUT" -X POST "$API/projects" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "ProgrammAgent",
    "idea": "ProgrammAgent soll Programme eigenstaendig builden."
  }')

check_response "$PROJECT_RESP" "Projekt erstellt"

PROJECT_ID=$(echo "$PROJECT_RESP" | jq -r '.project.id')
echo -e "  ${YELLOW}Project-ID:${NC} $PROJECT_ID"
print_field "$PROJECT_RESP" '.flowState.currentStep' "Current Step"

# =============================================================================
# 2. Flow-State pruefen
# =============================================================================
header "Flow-State pruefen"

FLOW_RESP=$(curl -s --max-time "$TIMEOUT" "$API/projects/$PROJECT_ID/flow")
check_response "$FLOW_RESP" "Flow-State geladen"
echo "$FLOW_RESP" | jq -r '.steps[] | "  \(.stepType): \(.status)"'

# =============================================================================
# 3. IDEA Step (Wizard) – bewusst vage, um Clarification auszuloesen
# =============================================================================
header "Wizard-Step: IDEA (vage Input -> Clarification erwartet)"

run_wizard_step "IDEA" '{
  "category": "SaaS",
  "productName": "ProgrammAgent",
  "vision": "Programme eigenstaendig builden"
}'

# =============================================================================
# 4. Chat: Gezielt eine Decision provozieren
#    Wir senden eine Nachricht die den Agent zwingt, Optionen vorzuschlagen
# =============================================================================
header "Chat: Decision provozieren (Zielplattform)"

send_chat "Ich bin unsicher ob ProgrammAgent eine Web-App, eine Desktop-App oder eine CLI sein soll. Was wuerdest du empfehlen? Bitte stelle die Optionen mit Vor- und Nachteilen gegenueber." \
  "Web-App, weil das die niedrigste Einstiegshuerde fuer Nutzer bietet."

# Falls noch keine Decision entstanden ist, nochmal nachfragen
if [ "$TOTAL_DECISIONS" -eq 0 ]; then
  header "Chat: Decision nochmals anfordern"

  send_chat "Kannst du bitte eine formelle Entscheidung erstellen mit den Optionen: 1) Web-App 2) Desktop-App 3) CLI Tool? Ich brauche eine strukturierte Entscheidungshilfe mit Vor- und Nachteilen." \
    "Web-App ist die beste Wahl fuer ein SaaS-Produkt."
fi

# =============================================================================
# 5. Chat: Gezielt eine Clarification provozieren
# =============================================================================
header "Chat: Clarification provozieren (fehlende Info)"

send_chat "Wie soll das Pricing-Modell aussehen? Und soll es eine Freemium-Version geben? Ich bin mir bei der Monetarisierung noch unsicher." \
  "Freemium mit kostenlosem Einstieg, Pro-Plan ab 29 EUR/Monat fuer unbegrenzte Projekte."

# Falls noch keine Clarification entstanden ist, nochmal nachfragen
if [ "$TOTAL_CLARIFICATIONS" -eq 0 ]; then
  header "Chat: Clarification nochmals anfordern"

  send_chat "Mir ist unklar, wer genau die primaere Zielgruppe sein soll. Sind es professionelle Entwickler die schneller arbeiten wollen, oder Nicht-Entwickler die ueberhaupt erst programmieren wollen? Das aendert die gesamte Produktrichtung." \
    "Primaere Zielgruppe sind Nicht-Entwickler und Citizen Developer, die eigene Software-Ideen umsetzen wollen."
fi

# =============================================================================
# 6. PROBLEM Step (Wizard)
# =============================================================================
header "Wizard-Step: PROBLEM"

run_wizard_step "PROBLEM" '{
  "coreProblems": "Software-Entwicklung ist zeitaufwaendig. Fuer Prototypen und MVPs wird viel Zeit fuer Boilerplate verschwendet. Nicht-Entwickler koennen Ideen nicht selbst umsetzen.",
  "currentSolutions": "GitHub Copilot, ChatGPT, Cursor IDE – erfordern aber technisches Grundwissen und manuelle Integration.",
  "painPoints": "Hohe Einstiegshuerde, fragmentierte Toolchain, kein End-to-End-Workflow"
}'

# =============================================================================
# 7. TARGET_AUDIENCE Step (Wizard) – widerspruchlich, um Clarification auszuloesen
# =============================================================================
header "Wizard-Step: TARGET_AUDIENCE (widerspruchlich -> Clarification erwartet)"

run_wizard_step "TARGET_AUDIENCE" '{
  "primaryAudience": "Sowohl professionelle Enterprise-Entwickler als auch absolute Programmier-Anfaenger",
  "secondaryAudience": "Produktmanager, Designer, Studenten",
  "userNeeds": "Einerseits volle Kontrolle ueber den generierten Code, andererseits moeglichst kein Code sichtbar",
  "techLevel": "Von absoluten Anfaengern bis zu Senior-Entwicklern mit 20+ Jahren Erfahrung"
}'

# =============================================================================
# 8. SCOPE Step (Wizard) – ueberambitioniert, um Decision auszuloesen
# =============================================================================
header "Wizard-Step: SCOPE (ueberambitioniert -> Decision erwartet)"

run_wizard_step "SCOPE" '{
  "inScope": "Web-Apps, Mobile Apps (iOS + Android), Desktop-Apps, CLI-Tools, Browser-Extensions, API-Server, Microservices, ML-Pipelines, Blockchain Smart Contracts",
  "outOfScope": "Nichts – alles soll moeglich sein",
  "constraints": "Budget: 0 EUR (Bootstrapped), Timeline: MVP in 4 Wochen, Team: 1 Person"
}'

# =============================================================================
# 9. MVP Step (Wizard)
# =============================================================================
header "Wizard-Step: MVP"

run_wizard_step "MVP" '{
  "mvpFeatures": "1. Natuerlichsprachliche Projektbeschreibung 2. Automatische Projektstruktur 3. Code-Generierung (Frontend + Backend) 4. Browser-Vorschau 5. Download als ZIP",
  "successMetrics": "50 Beta-User in 4 Wochen, Generierungszeit unter 2 Min, NPS > 30",
  "mvpTimeline": "3 Monate bis zur oeffentlichen Beta"
}'

# =============================================================================
# 10. FEATURES Step (Wizard)
# =============================================================================
header "Wizard-Step: FEATURES"

run_wizard_step "FEATURES" '{
  "coreFeatures": "Natuerlichsprachlicher Projekt-Editor, Template-Bibliothek, Live-Preview, Code-Export, Versionierung",
  "niceToHave": "Kollaboration, Git-Integration, Custom-Templates, API-Docs-Generierung",
  "prioritization": "P1: Editor + Generierung, P2: Preview + Export, P3: Templates, P4: Kollaboration"
}'

# =============================================================================
# 11. ARCHITECTURE Step (Wizard) – Monolith vs. Microservices als Decision-Trigger
# =============================================================================
header "Wizard-Step: ARCHITECTURE (Trade-off -> Decision erwartet)"

run_wizard_step "ARCHITECTURE" '{
  "systemDesign": "Unklar ob Monolith oder Microservices. Einerseits soll es schnell gebaut werden (spricht fuer Monolith), andererseits sollen Code-Generierung und Preview unabhaengig skalieren (spricht fuer Microservices).",
  "techStack": "Backend: Python oder Node.js (noch unklar), Frontend: Next.js + React, AI: OpenAI GPT-4, Infra: Docker",
  "integrations": "OpenAI API, GitHub API, evtl. Vercel",
  "dataModel": "PostgreSQL fuer User/Projekte, Redis fuer Sessions, S3 fuer generierte Dateien"
}'

# =============================================================================
# 12. BACKEND Step (Wizard)
# =============================================================================
header "Wizard-Step: BACKEND"

run_wizard_step "BACKEND" '{
  "apiDesign": "REST API mit OpenAPI-Spec, Endpunkte: /projects, /generate, /preview, /export",
  "authentication": "JWT-basiert, OAuth2 mit GitHub/Google Login",
  "businessLogic": "Prompt-Engineering-Pipeline, Template-Engine, Code-Validierung, Sandbox-Execution",
  "database": "PostgreSQL mit Prisma ORM"
}'

# =============================================================================
# 13. FRONTEND Step (letzter Wizard-Step)
# =============================================================================
header "Wizard-Step: FRONTEND (letzter Step)"

run_wizard_step "FRONTEND" '{
  "uiFramework": "Next.js 15 + React 19, Tailwind CSS, shadcn/ui",
  "keyScreens": "Dashboard, Projekt-Editor (Split-View), Template-Galerie, Settings",
  "stateManagement": "Zustand fuer Client-State, React Query fuer Server-State",
  "responsive": "Mobile-first, aber primaer Desktop-Nutzung"
}'

print_field "$LAST_WIZARD_RESP" '.exportTriggered' "Export ausgeloest"

# =============================================================================
# 14. Finaler Flow-State
# =============================================================================
header "Finaler Flow-State"

FINAL_FLOW=$(curl -s --max-time "$TIMEOUT" "$API/projects/$PROJECT_ID/flow")
check_response "$FINAL_FLOW" "Finaler Flow-State geladen"
echo "$FINAL_FLOW" | jq -r '.steps[] | "  \(.stepType): \(.status)"'

# =============================================================================
# 15. Alle Decisions auflisten
# =============================================================================
header "Alle Decisions"

ALL_DECISIONS=$(curl -s --max-time "$TIMEOUT" "$API/projects/$PROJECT_ID/decisions")
DEC_COUNT=$(echo "$ALL_DECISIONS" | jq 'length')
echo -e "  ${YELLOW}Anzahl Decisions:${NC} $DEC_COUNT"

if [ "$DEC_COUNT" -gt 0 ]; then
  echo "$ALL_DECISIONS" | jq -r '.[] | "  [\(.status)] \(.title)"'
fi

# =============================================================================
# 16. Alle Clarifications auflisten
# =============================================================================
header "Alle Clarifications"

ALL_CLARIFICATIONS=$(curl -s --max-time "$TIMEOUT" "$API/projects/$PROJECT_ID/clarifications")
CLAR_COUNT=$(echo "$ALL_CLARIFICATIONS" | jq 'length')
echo -e "  ${YELLOW}Anzahl Clarifications:${NC} $CLAR_COUNT"

if [ "$CLAR_COUNT" -gt 0 ]; then
  echo "$ALL_CLARIFICATIONS" | jq -r '.[] | "  [\(.status)] \(.question)"'
fi

# =============================================================================
# 17. Generierte Spec-Dateien
# =============================================================================
header "Generierte Spec-Dateien"

FILES_RESP=$(curl -s --max-time "$TIMEOUT" "$API/projects/$PROJECT_ID/files")
check_response "$FILES_RESP" "Dateien geladen"
echo "$FILES_RESP" | jq -r '.[] | "  \(.name // .)"' 2>/dev/null || echo "$FILES_RESP" | jq .

# =============================================================================
# 18. Task-Generierung (Plan)
# =============================================================================
header "Tasks generieren (Plan)"

TASKS_RESP=$(curl -s --max-time "$TIMEOUT" -X POST "$API/projects/$PROJECT_ID/tasks/generate" \
  -H "Content-Type: application/json")

check_response "$TASKS_RESP" "Tasks generiert"

ALL_TASKS=$(curl -s --max-time "$TIMEOUT" "$API/projects/$PROJECT_ID/tasks")
TASK_COUNT=$(echo "$ALL_TASKS" | jq 'length')
echo -e "  ${YELLOW}Anzahl Tasks:${NC} $TASK_COUNT"

if [ "$TASK_COUNT" -gt 0 ]; then
  echo "$ALL_TASKS" | jq -r '.[] | "  [\(.type)] \(.title) (\(.status))"' | head -15
  if [ "$TASK_COUNT" -gt 15 ]; then
    echo "  ... und $((TASK_COUNT - 15)) weitere"
  fi
fi

# =============================================================================
# Zusammenfassung
# =============================================================================
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  Test abgeschlossen!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "  ${YELLOW}Projekt-ID:${NC}     $PROJECT_ID"
echo -e "  ${YELLOW}Decisions:${NC}      $DEC_COUNT"
echo -e "  ${YELLOW}Clarifications:${NC} $CLAR_COUNT"
echo -e "  ${YELLOW}Tasks:${NC}          $TASK_COUNT"
echo ""

if [ "$DEC_COUNT" -gt 0 ] && [ "$CLAR_COUNT" -gt 0 ]; then
  echo -e "  ${GREEN}Decisions und Clarifications wurden erfolgreich erzeugt!${NC}"
elif [ "$DEC_COUNT" -gt 0 ]; then
  echo -e "  ${GREEN}Decisions wurden erzeugt.${NC} ${YELLOW}Clarifications: keine (Agent hat keine erzeugt)${NC}"
elif [ "$CLAR_COUNT" -gt 0 ]; then
  echo -e "  ${GREEN}Clarifications wurden erzeugt.${NC} ${YELLOW}Decisions: keine (Agent hat keine erzeugt)${NC}"
else
  echo -e "  ${RED}WARNUNG: Weder Decisions noch Clarifications wurden erzeugt!${NC}"
  echo -e "  ${RED}Moeglicherweise nutzt der LLM die Marker noch nicht korrekt.${NC}"
fi

echo ""
echo -e "  ${BLUE}Aufraeumen:${NC} curl -s -X DELETE $API/projects/$PROJECT_ID"
echo ""
