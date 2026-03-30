# Architecture: Authentifizierung & Autorisierung

## Überblick
Multi-User-System mit JWT-basierter Authentifizierung via Spring Security.

## Rollen
| Rolle | Beschreibung | Berechtigungen |
|-------|-------------|----------------|
| `OWNER` | Ersteller eines Projekts | Alles: CRUD, Export, Delete, Mitglieder verwalten |
| `CONTRIBUTOR` | Mitarbeiter | Lesen, Schreiben, Decisions treffen, Tasks bearbeiten |
| `VIEWER` | Nur Lesen | Lesen aller Artefakte, kein Schreiben |

## Flow
1. User registriert sich via `POST /api/v1/auth/register`
2. User loggt sich ein via `POST /api/v1/auth/login` → erhält JWT Access + Refresh Token
3. Frontend speichert Token, sendet bei jedem Request als `Authorization: Bearer <token>`
4. Backend validiert Token, extrahiert User-ID und Rollen
5. Refresh via `POST /api/v1/auth/refresh`

## Persistenz
- User-Daten als JSON-Files unter `data/users/{user-id}.json`
- Passwörter gehasht mit BCrypt
- Projekt-Mitgliedschaften in `data/projects/{project-id}/members.json`

## Technische Details
- Spring Security Filter Chain mit JWT-Filter
- Stateless Sessions (kein Server-Side Session State)
- Token-Expiry: Access 1h, Refresh 7d
