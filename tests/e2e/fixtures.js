// Fixture bersama: login per role, klien API untuk cek data, dan GAGAL bila ada error di console browser.
import { test as base, expect } from '@playwright/test';
import PocketBase from 'pocketbase';
import { PB_URL, USERS, USER_PASSWORD } from './env.js';

export const test = base.extend({
  page: async ({ page }, use) => {
    const errors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
    await use(page);
    // test yang sengaja memicu penolakan server / jaringan putus menyalakan page.__allowHttpErrors
    const real = errors.filter((e) => !(page.__allowHttpErrors && /(status of [45]\d\d|net::ERR_|Failed to fetch)/.test(e)));
    expect(real, `Error di console browser:\n${real.join('\n')}`).toEqual([]);
  },
});

export { expect };

/** Login lewat form seperti pengguna sungguhan. */
export async function login(page, role) {
  await page.goto('/');
  await page.getByLabel('Email').fill(USERS[role]);
  await page.getByLabel('Password', { exact: true }).fill(USER_PASSWORD);
  await page.getByRole('button', { name: 'Masuk' }).click();
  await expect(page.getByRole('heading', { name: /^Halo,/ })).toBeVisible();
}

/** Klien PocketBase untuk memeriksa data hasil aksi di layar. */
export async function api(role = 'owner') {
  const pb = new PocketBase(PB_URL);
  pb.autoCancellation(false);
  await pb.collection('users').authWithPassword(USERS[role], USER_PASSWORD);
  return pb;
}

export const stockOf = async (pb, code) => (await pb.collection('products').getFirstListItem(`code = "${code}"`)).stock;

/** Toast sukses / error terakhir */
export const toast = (page) => page.locator('.toast').last();
