# Feature 0: Project Setup — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Set up the monorepo with a working Kotlin/Spring Boot backend and Next.js frontend, connected via REST, deployable with Docker Compose.

**Architecture:** Monorepo with `/backend` (Kotlin + Spring Boot 4 + Koog) and `/frontend` (Next.js 16 + React 19 + shadcn/ui + Rete.js). Backend serves REST API on port 8080, frontend on port 3000. Docker Compose orchestrates both services. JWT auth is prepared but not fully implemented (that's part of later features).

**Tech Stack:** Kotlin 2.3.10, Spring Boot 4.0.5, Gradle 9.4, JetBrains Koog 0.7.3, Next.js 16, React 19, TypeScript 5, Tailwind CSS v4, @base-ui/react, CVA, Zustand, Rete.js v2, Docker Compose

---

## File Structure

### Backend (`/backend`)

| File | Responsibility |
|------|---------------|
| `backend/build.gradle.kts` | Gradle build config with Spring Boot, Koog, Security dependencies |
| `backend/settings.gradle.kts` | Gradle project settings |
| `backend/src/main/kotlin/.../ProductSpecAgentApplication.kt` | Spring Boot application entry point |
| `backend/src/main/kotlin/.../api/HealthController.kt` | `GET /api/health` endpoint |
| `backend/src/main/kotlin/.../config/CorsConfig.kt` | CORS configuration for frontend origin |
| `backend/src/main/kotlin/.../config/SecurityConfig.kt` | Spring Security config (permit health, prepare JWT) |
| `backend/src/main/resources/application.yml` | Application configuration (ports, CORS origins, Koog) |
| `backend/src/test/kotlin/.../api/HealthControllerTest.kt` | Integration test for health endpoint |
| `backend/Dockerfile` | Multi-stage Docker build for backend |

*Note: `...` = `com/agentwork/productspecagent`*

### Frontend (`/frontend`)

| File | Responsibility |
|------|---------------|
| `frontend/package.json` | npm dependencies and scripts |
| `frontend/next.config.ts` | Next.js configuration |
| `frontend/tsconfig.json` | TypeScript configuration |
| `frontend/postcss.config.mjs` | PostCSS config for Tailwind v4 |
| `frontend/src/app/layout.tsx` | Root layout with fonts, theme |
| `frontend/src/app/page.tsx` | Landing page |
| `frontend/src/app/globals.css` | Tailwind + CSS custom properties (design system) |
| `frontend/src/lib/utils.ts` | `cn()` utility |
| `frontend/src/lib/api.ts` | API client for backend communication |
| `frontend/src/components/ui/button.tsx` | Button component (CVA) |
| `frontend/src/components/ui/card.tsx` | Card component (CVA) |
| `frontend/Dockerfile` | Multi-stage Docker build for frontend |

### Root

| File | Responsibility |
|------|---------------|
| `docker-compose.yml` | Orchestrates backend + frontend services |
| `.gitignore` | Updated for monorepo (node_modules, .next, data/) |
| `README.md` | Updated project overview |

---

## Task 1: Restructure to Monorepo

Move existing backend code from root into `/backend` subdirectory.

**Files:**
- Move: `build.gradle.kts` → `backend/build.gradle.kts`
- Move: `settings.gradle.kts` → `backend/settings.gradle.kts`
- Move: `src/` → `backend/src/`
- Move: `gradle/` → `backend/gradle/`
- Move: `gradlew`, `gradlew.bat` → `backend/gradlew`, `backend/gradlew.bat`
- Modify: `.gitignore`

- [ ] **Step 1: Create backend directory and move files**

```bash
cd /Users/czarnik/IdeaProjects/ProductSpecAgent
mkdir -p backend
mv build.gradle.kts backend/
mv settings.gradle.kts backend/
mv src backend/
mv gradle backend/
mv gradlew backend/
mv gradlew.bat backend/
mv HELP.md backend/
```

- [ ] **Step 2: Update .gitignore for monorepo**

Replace the current `.gitignore` with:

```gitignore
# Backend
backend/.gradle/
backend/build/
backend/out/

# Frontend
frontend/node_modules/
frontend/.next/
frontend/out/

# Runtime data
data/

# IDE
.idea/
*.iml

# OS
.DS_Store
Thumbs.db

# Environment
.env
.env.local
.env.*.local
```

- [ ] **Step 3: Remove root .gradle directory**

```bash
rm -rf .gradle
```

- [ ] **Step 4: Verify backend still builds**

```bash
cd /Users/czarnik/IdeaProjects/ProductSpecAgent/backend
./gradlew build
```

Expected: BUILD SUCCESSFUL

- [ ] **Step 5: Commit**

```bash
cd /Users/czarnik/IdeaProjects/ProductSpecAgent
git add -A
git commit -m "refactor: restructure project as monorepo with backend subdirectory"
```

---

## Task 2: Update Backend Dependencies (Koog + Security)

Upgrade Kotlin version and add Koog + Spring Security dependencies.

**Files:**
- Modify: `backend/build.gradle.kts`
- Modify: `backend/src/main/resources/application.properties` → rename to `application.yml`

- [ ] **Step 1: Update build.gradle.kts**

Replace `backend/build.gradle.kts` with:

```kotlin
plugins {
    kotlin("jvm") version "2.3.10"
    kotlin("plugin.spring") version "2.3.10"
    kotlin("plugin.serialization") version "2.3.10"
    id("org.springframework.boot") version "4.0.5"
    id("io.spring.dependency-management") version "1.1.7"
}

group = "com.agentwork"
version = "0.0.1-SNAPSHOT"
description = "ProductSpecAgent"

java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(21)
    }
}

repositories {
    mavenCentral()
}

dependencies {
    // Spring Boot
    implementation("org.springframework.boot:spring-boot-starter-webmvc")
    implementation("org.springframework.boot:spring-boot-starter-security")

    // Kotlin
    implementation("org.jetbrains.kotlin:kotlin-reflect")
    implementation("tools.jackson.module:jackson-module-kotlin")
    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.10.0")

    // Koog AI Agent Framework
    implementation("ai.koog:koog-spring-boot-starter:0.7.3")

    // Test
    testImplementation("org.springframework.boot:spring-boot-starter-webmvc-test")
    testImplementation("org.springframework.security:spring-security-test")
    testImplementation("org.jetbrains.kotlin:kotlin-test-junit5")
    testRuntimeOnly("org.junit.platform:junit-platform-launcher")
}

kotlin {
    compilerOptions {
        freeCompilerArgs.addAll("-Xjsr305=strict", "-Xannotation-default-target=param-property")
    }
}

tasks.withType<Test> {
    useJUnitPlatform()
}
```

- [ ] **Step 2: Replace application.properties with application.yml**

Delete `backend/src/main/resources/application.properties` and create `backend/src/main/resources/application.yml`:

```yaml
server:
  port: 8080

spring:
  application:
    name: product-spec-agent

cors:
  allowed-origins: "http://localhost:3000"

koog:
  provider: anthropic
  model: claude-sonnet-4-6
```

- [ ] **Step 3: Verify build compiles**

```bash
cd /Users/czarnik/IdeaProjects/ProductSpecAgent/backend
./gradlew build
```

Expected: BUILD SUCCESSFUL (tests may fail — that's fine, we fix them next)

- [ ] **Step 4: Commit**

```bash
cd /Users/czarnik/IdeaProjects/ProductSpecAgent
git add backend/build.gradle.kts backend/src/main/resources/application.yml
git rm backend/src/main/resources/application.properties 2>/dev/null; true
git commit -m "feat: add Koog, Spring Security, kotlinx-serialization dependencies"
```

---

## Task 3: Health Endpoint with Test (TDD)

**Files:**
- Create: `backend/src/test/kotlin/com/agentwork/productspecagent/api/HealthControllerTest.kt`
- Create: `backend/src/main/kotlin/com/agentwork/productspecagent/api/HealthController.kt`
- Create: `backend/src/main/kotlin/com/agentwork/productspecagent/config/SecurityConfig.kt`

- [ ] **Step 1: Write the failing test**

Create `backend/src/test/kotlin/com/agentwork/productspecagent/api/HealthControllerTest.kt`:

```kotlin
package com.agentwork.productspecagent.api

import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.get

@SpringBootTest
@AutoConfigureMockMvc
class HealthControllerTest {

    @Autowired
    lateinit var mockMvc: MockMvc

    @Test
    fun `GET api health returns 200 with status UP`() {
        mockMvc.get("/api/health")
            .andExpect {
                status { isOk() }
                jsonPath("$.status") { value("UP") }
            }
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/czarnik/IdeaProjects/ProductSpecAgent/backend
./gradlew test --tests "com.agentwork.productspecagent.api.HealthControllerTest"
```

Expected: FAIL (404 — endpoint doesn't exist yet, or 401 because Security blocks it)

- [ ] **Step 3: Create SecurityConfig to permit health endpoint**

Create `backend/src/main/kotlin/com/agentwork/productspecagent/config/SecurityConfig.kt`:

```kotlin
package com.agentwork.productspecagent.config

import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.security.config.annotation.web.builders.HttpSecurity
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity
import org.springframework.security.config.http.SessionCreationPolicy
import org.springframework.security.web.SecurityFilterChain

@Configuration
@EnableWebSecurity
class SecurityConfig {

    @Bean
    fun securityFilterChain(http: HttpSecurity): SecurityFilterChain {
        http
            .csrf { it.disable() }
            .sessionManagement { it.sessionCreationPolicy(SessionCreationPolicy.STATELESS) }
            .authorizeHttpRequests { auth ->
                auth
                    .requestMatchers("/api/health").permitAll()
                    .anyRequest().authenticated()
            }
        return http.build()
    }
}
```

- [ ] **Step 4: Create HealthController**

Create `backend/src/main/kotlin/com/agentwork/productspecagent/api/HealthController.kt`:

```kotlin
package com.agentwork.productspecagent.api

import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RestController
import java.time.Instant

@RestController
class HealthController {

    @GetMapping("/api/health")
    fun health(): Map<String, String> {
        return mapOf(
            "status" to "UP",
            "timestamp" to Instant.now().toString()
        )
    }
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
cd /Users/czarnik/IdeaProjects/ProductSpecAgent/backend
./gradlew test --tests "com.agentwork.productspecagent.api.HealthControllerTest"
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
cd /Users/czarnik/IdeaProjects/ProductSpecAgent
git add backend/src/
git commit -m "feat: add health endpoint with security config (TDD)"
```

---

## Task 4: CORS Configuration with Test (TDD)

**Files:**
- Create: `backend/src/test/kotlin/com/agentwork/productspecagent/config/CorsTest.kt`
- Create: `backend/src/main/kotlin/com/agentwork/productspecagent/config/CorsConfig.kt`

- [ ] **Step 1: Write the failing test**

Create `backend/src/test/kotlin/com/agentwork/productspecagent/config/CorsTest.kt`:

```kotlin
package com.agentwork.productspecagent.config

import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.options

@SpringBootTest
@AutoConfigureMockMvc
class CorsTest {

    @Autowired
    lateinit var mockMvc: MockMvc

    @Test
    fun `CORS preflight from localhost 3000 is allowed`() {
        mockMvc.options("/api/health") {
            header("Origin", "http://localhost:3000")
            header("Access-Control-Request-Method", "GET")
        }.andExpect {
            status { isOk() }
            header {
                string("Access-Control-Allow-Origin", "http://localhost:3000")
            }
        }
    }

    @Test
    fun `CORS preflight from unknown origin is rejected`() {
        mockMvc.options("/api/health") {
            header("Origin", "http://evil.com")
            header("Access-Control-Request-Method", "GET")
        }.andExpect {
            header {
                doesNotExist("Access-Control-Allow-Origin")
            }
        }
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/czarnik/IdeaProjects/ProductSpecAgent/backend
./gradlew test --tests "com.agentwork.productspecagent.config.CorsTest"
```

Expected: FAIL (no CORS headers)

- [ ] **Step 3: Create CorsConfig**

Create `backend/src/main/kotlin/com/agentwork/productspecagent/config/CorsConfig.kt`:

```kotlin
package com.agentwork.productspecagent.config

import org.springframework.beans.factory.annotation.Value
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.web.cors.CorsConfiguration
import org.springframework.web.cors.CorsConfigurationSource
import org.springframework.web.cors.UrlBasedCorsConfigurationSource

@Configuration
class CorsConfig {

    @Value("\${cors.allowed-origins}")
    lateinit var allowedOrigins: String

    @Bean
    fun corsConfigurationSource(): CorsConfigurationSource {
        val config = CorsConfiguration().apply {
            allowedOrigins = this@CorsConfig.allowedOrigins.split(",").map { it.trim() }
            allowedMethods = listOf("GET", "POST", "PUT", "DELETE", "OPTIONS")
            allowedHeaders = listOf("*")
            allowCredentials = true
        }
        val source = UrlBasedCorsConfigurationSource()
        source.registerCorsConfiguration("/api/**", config)
        return source
    }
}
```

- [ ] **Step 4: Update SecurityConfig to use CORS**

In `backend/src/main/kotlin/com/agentwork/productspecagent/config/SecurityConfig.kt`, add `.cors {}` to the security chain:

```kotlin
package com.agentwork.productspecagent.config

import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.security.config.annotation.web.builders.HttpSecurity
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity
import org.springframework.security.config.http.SessionCreationPolicy
import org.springframework.security.web.SecurityFilterChain

@Configuration
@EnableWebSecurity
class SecurityConfig {

    @Bean
    fun securityFilterChain(http: HttpSecurity): SecurityFilterChain {
        http
            .cors {}
            .csrf { it.disable() }
            .sessionManagement { it.sessionCreationPolicy(SessionCreationPolicy.STATELESS) }
            .authorizeHttpRequests { auth ->
                auth
                    .requestMatchers("/api/health").permitAll()
                    .anyRequest().authenticated()
            }
        return http.build()
    }
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd /Users/czarnik/IdeaProjects/ProductSpecAgent/backend
./gradlew test --tests "com.agentwork.productspecagent.config.CorsTest"
```

Expected: PASS (both tests)

- [ ] **Step 6: Run all backend tests**

```bash
cd /Users/czarnik/IdeaProjects/ProductSpecAgent/backend
./gradlew test
```

Expected: All tests PASS

- [ ] **Step 7: Commit**

```bash
cd /Users/czarnik/IdeaProjects/ProductSpecAgent
git add backend/src/
git commit -m "feat: add CORS configuration for frontend origin (TDD)"
```

---

## Task 5: Scaffold Frontend (Next.js + Tailwind + Design System)

**Files:**
- Create: `frontend/` directory with Next.js project
- Create: `frontend/src/app/globals.css` with design system CSS variables
- Create: `frontend/src/lib/utils.ts` with `cn()` utility

- [ ] **Step 1: Create Next.js project**

```bash
cd /Users/czarnik/IdeaProjects/ProductSpecAgent
npx create-next-app@latest frontend \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*" \
  --no-turbopack
```

- [ ] **Step 2: Install design system dependencies**

```bash
cd /Users/czarnik/IdeaProjects/ProductSpecAgent/frontend
npm install @base-ui/react class-variance-authority clsx tailwind-merge lucide-react zustand
npm install styled-components
```

- [ ] **Step 3: Install Rete.js packages**

```bash
cd /Users/czarnik/IdeaProjects/ProductSpecAgent/frontend
npm install rete rete-area-plugin rete-connection-plugin rete-react-plugin rete-render-utils
```

- [ ] **Step 4: Create cn() utility**

Create `frontend/src/lib/utils.ts`:

```typescript
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 5: Set up globals.css with design system**

Replace `frontend/src/app/globals.css` with:

```css
@import "tailwindcss";

@custom-variant dark (&:is(.dark *));

@theme inline {
  --color-background: oklch(0.13 0.02 260);
  --color-foreground: oklch(0.93 0.01 250);
  --color-card: oklch(0.17 0.02 260);
  --color-card-foreground: oklch(0.93 0.01 250);
  --color-primary: oklch(0.62 0.19 260);
  --color-primary-foreground: oklch(0.98 0 0);
  --color-secondary: oklch(0.22 0.03 260);
  --color-secondary-foreground: oklch(0.93 0.01 250);
  --color-muted: oklch(0.22 0.03 260);
  --color-muted-foreground: oklch(0.55 0.03 250);
  --color-accent: oklch(0.22 0.03 260);
  --color-accent-foreground: oklch(0.93 0.01 250);
  --color-destructive: oklch(0.65 0.2 25);
  --color-border: oklch(1 0 0 / 10%);
  --color-input: oklch(1 0 0 / 12%);
  --color-ring: oklch(0.62 0.19 260);
  --color-popover: oklch(0.17 0.02 260);
  --color-popover-foreground: oklch(0.93 0.01 250);
  --color-sidebar: oklch(0.15 0.025 260);
  --color-sidebar-foreground: oklch(0.93 0.01 250);
  --color-sidebar-primary: oklch(0.62 0.19 260);
  --color-sidebar-accent: oklch(0.22 0.03 260);
  --color-sidebar-border: oklch(1 0 0 / 10%);
  --color-chart-1: oklch(0.62 0.19 260);
  --color-chart-2: oklch(0.65 0.15 160);
  --color-chart-3: oklch(0.6 0.18 300);
  --color-chart-4: oklch(0.7 0.15 60);
  --color-chart-5: oklch(0.6 0.2 30);
  --radius: 0.625rem;
  --font-sans: "Inter", ui-sans-serif, system-ui, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, monospace;
}

html {
  color-scheme: dark;
}

body {
  background: var(--color-background);
  color: var(--color-foreground);
  font-family: var(--font-sans);
}
```

- [ ] **Step 6: Verify frontend starts**

```bash
cd /Users/czarnik/IdeaProjects/ProductSpecAgent/frontend
npm run dev &
sleep 3
curl -s http://localhost:3000 | head -20
kill %1
```

Expected: HTML response from Next.js

- [ ] **Step 7: Commit**

```bash
cd /Users/czarnik/IdeaProjects/ProductSpecAgent
git add frontend/
git commit -m "feat: scaffold Next.js frontend with Tailwind, design system, Rete.js deps"
```

---

## Task 6: Frontend Base Components (Button + Card)

**Files:**
- Create: `frontend/src/components/ui/button.tsx`
- Create: `frontend/src/components/ui/card.tsx`

- [ ] **Step 1: Create Button component**

Create `frontend/src/components/ui/button.tsx`:

```tsx
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-all active:translate-y-px disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-xs hover:bg-primary/90",
        outline:
          "border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        destructive:
          "bg-destructive text-white shadow-xs hover:bg-destructive/90",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        xs: "h-6 rounded-md px-2 text-xs",
        sm: "h-7 rounded-md px-3",
        default: "h-8 px-3 py-1.5",
        lg: "h-9 rounded-md px-4",
        icon: "size-8",
        "icon-xs": "size-6",
        "icon-sm": "size-7",
        "icon-lg": "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

function Button({ className, variant, size, ...props }: ButtonProps) {
  return (
    <button
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
```

- [ ] **Step 2: Create Card component**

Create `frontend/src/components/ui/card.tsx`:

```tsx
import * as React from "react";
import { cn } from "@/lib/utils";

function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="card"
      className={cn("bg-card text-card-foreground border rounded-xl", className)}
      {...props}
    />
  );
}

function CardHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="card-header"
      className={cn("grid gap-1.5 p-4", className)}
      {...props}
    />
  );
}

function CardTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      data-slot="card-title"
      className={cn("text-base font-semibold leading-snug", className)}
      {...props}
    />
  );
}

function CardDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      data-slot="card-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

function CardContent({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-4 pb-4", className)}
      {...props}
    />
  );
}

function CardFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center px-4 pb-4", className)}
      {...props}
    />
  );
}

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };
```

- [ ] **Step 3: Commit**

```bash
cd /Users/czarnik/IdeaProjects/ProductSpecAgent
git add frontend/src/components/
git commit -m "feat: add Button and Card UI components (CVA design system)"
```

---

## Task 7: Frontend Landing Page + API Client

**Files:**
- Create: `frontend/src/lib/api.ts`
- Modify: `frontend/src/app/layout.tsx`
- Modify: `frontend/src/app/page.tsx`

- [ ] **Step 1: Create API client**

Create `frontend/src/lib/api.ts`:

```typescript
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export async function apiFetch<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    ...options,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error.message || `API error: ${res.status}`);
  }

  return res.json();
}

export async function getHealth(): Promise<{ status: string; timestamp: string }> {
  return apiFetch("/api/health");
}
```

- [ ] **Step 2: Update root layout**

Replace `frontend/src/app/layout.tsx` with:

```tsx
import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Product Spec Agent",
  description: "Von der Idee zur umsetzbaren Produktspezifikation",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de" className="dark">
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Create landing page**

Replace `frontend/src/app/page.tsx` with:

```tsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Product Spec Agent</CardTitle>
          <CardDescription>
            Von der Idee zur umsetzbaren Produktspezifikation
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            Erstelle strukturierte Produktspezifikationen mit AI-Unterstuetzung.
            Guided Decisions, Clarification Engine und Agent-ready Export.
          </p>
          <Button>Neues Projekt starten</Button>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 4: Add environment variable for API URL**

Create `frontend/.env.local`:

```
NEXT_PUBLIC_API_URL=http://localhost:8080
```

- [ ] **Step 5: Verify page renders**

```bash
cd /Users/czarnik/IdeaProjects/ProductSpecAgent/frontend
npm run build
```

Expected: Build succeeds without errors

- [ ] **Step 6: Commit**

```bash
cd /Users/czarnik/IdeaProjects/ProductSpecAgent
git add frontend/src/app/ frontend/src/lib/api.ts frontend/.env.local
git commit -m "feat: add landing page with API client and design system layout"
```

---

## Task 8: Docker Compose Setup

**Files:**
- Create: `backend/Dockerfile`
- Create: `frontend/Dockerfile`
- Create: `docker-compose.yml`

- [ ] **Step 1: Create backend Dockerfile**

Create `backend/Dockerfile`:

```dockerfile
FROM eclipse-temurin:21-jdk AS build
WORKDIR /app
COPY gradle/ gradle/
COPY gradlew build.gradle.kts settings.gradle.kts ./
RUN ./gradlew dependencies --no-daemon || true
COPY src/ src/
RUN ./gradlew bootJar --no-daemon

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /app/build/libs/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
```

- [ ] **Step 2: Create frontend Dockerfile**

Create `frontend/Dockerfile`:

```dockerfile
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```

- [ ] **Step 3: Update next.config.ts for standalone output**

Ensure `frontend/next.config.ts` includes standalone output:

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
};

export default nextConfig;
```

- [ ] **Step 4: Create docker-compose.yml**

Create `docker-compose.yml` at project root:

```yaml
services:
  backend:
    build: ./backend
    ports:
      - "8080:8080"
    volumes:
      - ./data:/app/data
    environment:
      - SPRING_PROFILES_ACTIVE=docker
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY:-}
    restart: unless-stopped

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://backend:8080
    depends_on:
      - backend
    restart: unless-stopped
```

- [ ] **Step 5: Create data directory placeholder**

```bash
mkdir -p /Users/czarnik/IdeaProjects/ProductSpecAgent/data
touch /Users/czarnik/IdeaProjects/ProductSpecAgent/data/.gitkeep
```

- [ ] **Step 6: Verify docker-compose config is valid**

```bash
cd /Users/czarnik/IdeaProjects/ProductSpecAgent
docker compose config
```

Expected: Valid YAML output with both services

- [ ] **Step 7: Commit**

```bash
cd /Users/czarnik/IdeaProjects/ProductSpecAgent
git add backend/Dockerfile frontend/Dockerfile frontend/next.config.ts docker-compose.yml data/.gitkeep
git commit -m "feat: add Docker Compose setup for backend and frontend"
```

---

## Task 9: End-to-End Smoke Test

Verify everything works together.

- [ ] **Step 1: Build and start with Docker Compose**

```bash
cd /Users/czarnik/IdeaProjects/ProductSpecAgent
docker compose up --build -d
```

Expected: Both containers start successfully

- [ ] **Step 2: Test backend health endpoint**

```bash
curl -s http://localhost:8080/api/health | python3 -m json.tool
```

Expected:
```json
{
    "status": "UP",
    "timestamp": "2026-03-30T..."
}
```

- [ ] **Step 3: Test CORS from frontend origin**

```bash
curl -s -H "Origin: http://localhost:3000" -I http://localhost:8080/api/health | grep -i access-control
```

Expected: `Access-Control-Allow-Origin: http://localhost:3000`

- [ ] **Step 4: Test frontend is serving**

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000
```

Expected: `200`

- [ ] **Step 5: Cleanup**

```bash
docker compose down
```

- [ ] **Step 6: Final commit**

```bash
cd /Users/czarnik/IdeaProjects/ProductSpecAgent
git add -A
git commit -m "chore: verify end-to-end setup complete"
```

---

## Summary

| Task | Description | Est. |
|------|-------------|------|
| 1 | Restructure to Monorepo | 3 min |
| 2 | Update Backend Dependencies (Koog + Security) | 3 min |
| 3 | Health Endpoint with Test (TDD) | 5 min |
| 4 | CORS Configuration with Test (TDD) | 5 min |
| 5 | Scaffold Frontend (Next.js + Design System) | 5 min |
| 6 | Frontend Base Components (Button + Card) | 3 min |
| 7 | Frontend Landing Page + API Client | 5 min |
| 8 | Docker Compose Setup | 5 min |
| 9 | End-to-End Smoke Test | 5 min |
