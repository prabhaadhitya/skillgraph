import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

// 1. Read environment variables / credentials
const backendEnvPath = path.resolve('backend/.env');
if (fs.existsSync(backendEnvPath)) {
  const content = fs.readFileSync(backendEnvPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx > 0) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

const DEMO_PASSWORD = process.env.DEMO_PASSWORD || 'DemoStudent123!';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@skillgraph.dev';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'AdminPassword123!';
const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

const OUT_DIR = path.resolve('docs/report/img');
fs.mkdirSync(OUT_DIR, { recursive: true });

async function waitNoSkeletons(page) {
  try {
    await page.waitForLoadState('networkidle', { timeout: 6000 });
  } catch {}
  try {
    await page.waitForSelector('.animate-pulse', { state: 'detached', timeout: 6000 });
  } catch {}
  await page.waitForTimeout(400);
}

async function loginUI(page, email, password, expectedUrl) {
  await page.goto(`${BASE_URL}/login`);
  await page.waitForSelector('#login-email', { timeout: 10000 });
  await page.fill('#login-email', email);
  await page.fill('#login-password', password);
  await page.click('button[type="submit"]');
  if (typeof expectedUrl === 'function') {
    await page.waitForURL(expectedUrl, { timeout: 15000 });
  } else if (expectedUrl) {
    await page.waitForURL(expectedUrl, { timeout: 15000 });
  }
  await waitNoSkeletons(page);
}

async function capture(page, filename, options = {}) {
  const targetPath = path.join(OUT_DIR, filename);
  await waitNoSkeletons(page);
  await page.screenshot({ path: targetPath, fullPage: false, ...options });
  const stats = fs.statSync(targetPath);
  const kb = (stats.size / 1024).toFixed(1);
  console.log(`[SAVED] ${filename} (${kb} KB)`);
  if (stats.size > 400 * 1024) {
    console.warn(`[WARNING] ${filename} exceeds 400 KB limit! (${kb} KB)`);
  }
}

async function main() {
  console.log('Starting SkillGraph report screenshot generation...');
  console.log(`Target directory: ${OUT_DIR}`);
  console.log(`Base URL: ${BASE_URL}`);

  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
  });

  try {
    // ------------------------------------------------------------------
    // Phase 1: Public pages (Landing, Register)
    // ------------------------------------------------------------------
    console.log('\n--- Capturing Public Pages ---');
    {
      const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
      const page = await context.newPage();

      // 01-landing.png
      await page.goto(`${BASE_URL}/`);
      await page.waitForSelector('text=See the skills between you and your dream job', { timeout: 10000 }).catch(() => {});
      await capture(page, '01-landing.png');

      // 02-register.png
      await page.goto(`${BASE_URL}/register`);
      await page.waitForSelector('#register-name, input[type="text"]', { timeout: 10000 }).catch(() => {});
      await capture(page, '02-register.png');

      await context.close();
    }

    // ------------------------------------------------------------------
    // Phase 2: Onboarding (Newbie persona)
    // ------------------------------------------------------------------
    console.log('\n--- Capturing Onboarding (Newbie) ---');
    {
      const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
      const page = await context.newPage();

      await loginUI(page, 'newbie@demo.skillgraph.dev', DEMO_PASSWORD, (url) => url.pathname.includes('/onboarding'));

      // Step 1: Wait for semester / next button
      await page.waitForSelector('#onboarding-semester', { timeout: 10000 });
      await page.selectOption('#onboarding-semester', '1');
      await page.waitForTimeout(300);
      await page.click('button:has-text("NEXT")');

      // Step 2: Choose target career
      await page.waitForSelector('div[role="radio"]', { timeout: 10000 });
      await page.locator('div[role="radio"]').first().click();
      await page.waitForTimeout(300);
      await page.click('button:has-text("NEXT")');

      // Step 3: Skills selection step
      await page.waitForSelector('text=Step 3 of 5', { timeout: 10000 });
      await page.waitForSelector('#skill-search', { timeout: 10000 });
      await waitNoSkeletons(page);
      await page.waitForTimeout(600);
      await capture(page, '03-onboarding-step3.png');

      await context.close();
    }

    // ------------------------------------------------------------------
    // Phase 3: Student pages (Prabha persona)
    // ------------------------------------------------------------------
    console.log('\n--- Capturing Student Pages (Prabha) ---');
    {
      const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
      const page = await context.newPage();

      await loginUI(page, 'prabha@demo.skillgraph.dev', DEMO_PASSWORD, (url) => url.pathname.includes('/app/dashboard'));

      // 04-dashboard.png
      await capture(page, '04-dashboard.png');

      // 05-graph.png
      await page.goto(`${BASE_URL}/app/graph`);
      await page.waitForSelector('.react-flow__node', { timeout: 12000 });
      await page.waitForTimeout(800);
      await capture(page, '05-graph.png');

      // 06-graph-panel.png: click a skill node to open detail panel
      const firstNode = page.locator('.react-flow__node').first();
      await firstNode.click();
      await page.waitForSelector('aside[aria-label="Skill details"]', { timeout: 8000 }).catch(() => {});
      await page.waitForTimeout(500);
      await capture(page, '06-graph-panel.png');

      // 07-path.png
      await page.goto(`${BASE_URL}/app/path`);
      await page.waitForSelector('text=LEARNING PATHWAY', { timeout: 10000 }).catch(() => {});
      await capture(page, '07-path.png');

      // 08-careers.png
      await page.goto(`${BASE_URL}/app/careers`);
      await page.waitForSelector('text=CAREER EXPLORER', { timeout: 10000 });
      await capture(page, '08-careers.png');

      // 09-compare.png: compare 2 careers
      const compareButtons = page.locator('button:has-text("COMPARE")');
      const count = await compareButtons.count();
      if (count >= 2) {
        await compareButtons.nth(0).click();
        await page.waitForTimeout(200);
        await compareButtons.nth(1).click();
        await page.waitForSelector('text=CAREER COMPARISON', { timeout: 8000 }).catch(() => {});
        await page.waitForTimeout(500);
        await capture(page, '09-compare.png');
        // Clear comparison
        const clearBtn = page.locator('button:has-text("CLEAR COMPARISON"), button:has-text("Clear")');
        if (await clearBtn.count() > 0) {
          await clearBtn.first().click().catch(() => {});
        }
      } else {
        console.warn('Could not find 2 compare buttons');
      }

      // 10-whatif.png: open "What if I switch?" modal
      const whatIfButtons = page.locator('button:has-text("WHAT IF I SWITCH?")');
      if (await whatIfButtons.count() > 1) {
        await whatIfButtons.nth(1).click();
        await page.waitForSelector('[role="dialog"]', { timeout: 8000 });
        await page.waitForTimeout(500);
        await capture(page, '10-whatif.png');
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);
      } else if (await whatIfButtons.count() > 0) {
        await whatIfButtons.first().click();
        await page.waitForSelector('[role="dialog"]', { timeout: 8000 });
        await page.waitForTimeout(500);
        await capture(page, '10-whatif.png');
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);
      }

      // 11-analytics.png
      await page.goto(`${BASE_URL}/app/analytics`);
      await page.waitForSelector('text=STUDENT ANALYTICS', { timeout: 10000 }).catch(() => {});
      await page.waitForTimeout(600);
      await capture(page, '11-analytics.png');

      // 12-assistant.png
      await page.goto(`${BASE_URL}/app/assistant`);
      await page.waitForSelector('text=STUDENT ASSISTANT', { timeout: 10000 }).catch(() => {});
      await page.waitForTimeout(400);
      await capture(page, '12-assistant.png');

      // 13-settings.png
      await page.goto(`${BASE_URL}/app/settings`);
      await page.waitForSelector('text=ASSISTANT KEY & MODEL', { timeout: 10000 }).catch(() => {});
      await capture(page, '13-settings.png');

      await context.close();
    }

    // ------------------------------------------------------------------
    // Phase 4: Admin pages (Admin persona)
    // ------------------------------------------------------------------
    console.log('\n--- Capturing Admin Pages ---');
    {
      const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
      const page = await context.newPage();

      await loginUI(page, ADMIN_EMAIL, ADMIN_PASSWORD, (url) => url.pathname.startsWith('/admin'));

      // 14-admin-overview.png
      await page.goto(`${BASE_URL}/admin/overview`);
      await page.waitForSelector('text=ADMIN DASHBOARD, text=KNOWLEDGE BASE', { timeout: 10000 }).catch(() => {});
      await page.waitForTimeout(500);
      await capture(page, '14-admin-overview.png');

      // 15-admin-skills.png
      await page.goto(`${BASE_URL}/admin/skills`);
      await page.waitForSelector('button:has-text("ADD SKILL")', { timeout: 10000 }).catch(() => {});
      await page.waitForTimeout(400);
      await capture(page, '15-admin-skills.png');

      // 16-admin-relationships.png
      await page.goto(`${BASE_URL}/admin/relationships`);
      await page.waitForSelector('text=GRAPH RELATIONSHIPS, text=Select a skill to inspect', { timeout: 10000 }).catch(() => {});
      await page.waitForTimeout(400);
      await capture(page, '16-admin-relationships.png');

      // 17-admin-careers.png
      await page.goto(`${BASE_URL}/admin/careers`);
      await page.waitForSelector('text=CAREER PATHWAYS, text=ADD CAREER', { timeout: 10000 }).catch(() => {});
      await page.waitForTimeout(400);
      await capture(page, '17-admin-careers.png');

      await context.close();
    }

    // ------------------------------------------------------------------
    // Phase 5: Mobile Dashboard (390x844)
    // ------------------------------------------------------------------
    console.log('\n--- Capturing Mobile Dashboard (390x844) ---');
    {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await context.newPage();

      await loginUI(page, 'prabha@demo.skillgraph.dev', DEMO_PASSWORD, (url) => url.pathname.includes('/app/dashboard'));
      await page.waitForTimeout(500);
      await capture(page, '18-mobile-dashboard.png');

      await context.close();
    }

    console.log('\nAll 18 screenshots captured successfully!');
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error('Screenshot script error:', err);
  process.exit(1);
});
