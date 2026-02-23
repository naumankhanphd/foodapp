import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import mysql from "mysql2/promise";
import { computeCheckoutTotal } from "../lib/pricing.mjs";
import {
  beginGoogleAuth,
  completeGoogleProfile,
  createSessionTokenForUser,
  loginWithPassword,
  registerWithPassword,
  requestPasswordReset,
  resetPassword,
  sendPhoneCode,
  verifyPhoneCode,
} from "../lib/auth/service.mjs";
import { evaluateAccessPolicy } from "../lib/auth/policy.mjs";
import {
  createItem,
  getAdminItemDetail,
  listAdminCategories,
  listAdminItems,
  resetMenuStoreForTests,
  updateItem,
} from "../lib/menu/store.mjs";
import { validateModifierGroupCreate } from "../lib/menu/validation.mjs";
import {
  addCartItem,
  previewCheckout,
  resetCartStoreForTests,
  updateCartItem,
} from "../lib/cart/store.mjs";

const DB_REQUIRED_CASES = new Set([
  "auth: customer signup and login works",
  "auth: google flow enforces completion + phone verification",
  "auth: password reset updates credentials",
  "menu: admin search and pagination work",
  "menu: create and update item tracks updatedAt",
  "cart: required modifiers are enforced when adding an item",
  "cart: update quantity and checkout preview compute totals",
  "checkout: minimum order is enforced for delivery",
]);

async function canConnectToDatabase() {
  const databaseUrl = String(process.env.DATABASE_URL || "").trim();
  if (!databaseUrl) {
    return false;
  }

  let connection;
  try {
    const parsed = new URL(databaseUrl);
    connection = await mysql.createConnection({
      host: parsed.hostname,
      port: Number(parsed.port || 3306),
      user: decodeURIComponent(parsed.username),
      password: decodeURIComponent(parsed.password),
      database: parsed.pathname.replace(/^\/+/, ""),
      connectTimeout: 4000,
    });
    await connection.query("SELECT 1");
    return true;
  } catch {
    return false;
  } finally {
    if (connection) {
      await connection.end().catch(() => {});
    }
  }
}

const cases = [
  {
    name: "pricing: includes subtotal, discount, tax, and delivery",
    run: () => {
      const total = computeCheckoutTotal({
        subtotal: 23.9,
        discount: 2,
        tax: 1.72,
        deliveryFee: 3.5,
      });
      assert.equal(total, 27.12);
    },
  },
  {
    name: "pricing: rounds to 2 decimals",
    run: () => {
      const total = computeCheckoutTotal({
        subtotal: 10.005,
        discount: 0,
        tax: 0,
        deliveryFee: 0,
      });
      assert.equal(total, 10.01);
    },
  },
  {
    name: "env template includes DATABASE_URL",
    run: () => {
      const envTemplate = readFileSync(".env.example", "utf8");
      assert.match(envTemplate, /DATABASE_URL=/);
    },
  },
  {
    name: "auth: customer signup and login works",
    run: async () => {
      await registerWithPassword({
        fullName: "Auth Customer",
        email: "auth.customer@example.com",
        password: "password123",
        role: "CUSTOMER",
      });

      const loggedIn = await loginWithPassword({
        email: "auth.customer@example.com",
        password: "password123",
        requiredRole: "CUSTOMER",
      });

      const token = createSessionTokenForUser(loggedIn);
      assert.ok(token.includes("."));
      assert.equal(loggedIn.role, "CUSTOMER");
    },
  },
  {
    name: "auth: google flow enforces completion + phone verification",
    run: async () => {
      const pending = await beginGoogleAuth({
        email: "google.new@example.com",
        fullName: "Google New",
        role: "CUSTOMER",
      });
      assert.equal(pending.requiresCompletion, true);

      const completed = await completeGoogleProfile({
        pendingToken: pending.pendingToken,
        phone: "+358401234567",
        addressLine1: "1 Main St",
        addressCity: "Austin",
        lat: 30.2672,
        lng: -97.7431,
      });

      const codeResult = await sendPhoneCode({ userId: completed.id });
      assert.ok(codeResult.devCode);

      const verified = await verifyPhoneCode({ userId: completed.id, code: codeResult.devCode });
      assert.equal(verified.phoneVerified, true);
    },
  },
  {
    name: "auth: password reset updates credentials",
    run: async () => {
      const resetRequest = await requestPasswordReset({ email: "customer@example.com" });
      assert.ok(resetRequest.devResetToken);

      await resetPassword({
        token: resetRequest.devResetToken,
        password: "new-password-123",
      });

      const loggedIn = await loginWithPassword({
        email: "customer@example.com",
        password: "new-password-123",
        requiredRole: "CUSTOMER",
      });

      assert.equal(loggedIn.email, "customer@example.com");
    },
  },
  {
    name: "rbac policy: guest cannot access checkout",
    run: () => {
      const decision = evaluateAccessPolicy("/checkout", null);
      assert.equal(decision.allowed, false);
      assert.equal(decision.reason, "AUTH_REQUIRED");
    },
  },
  {
    name: "menu: admin search and pagination work",
    run: async () => {
      resetMenuStoreForTests();
      const result = await listAdminItems({
        search: "chicken",
        page: 1,
        pageSize: 1,
      });
      assert.equal(result.data.length, 1);
      assert.equal(result.pagination.total >= 1, true);
      assert.equal(result.pagination.pageSize, 1);
    },
  },
  {
    name: "menu: create and update item tracks updatedAt",
    run: async () => {
      resetMenuStoreForTests();
      const categories = (await listAdminCategories({ page: 1, pageSize: 10 })).data;
      const categoryId = categories[0].id;

      const created = await createItem({
        categoryId,
        name: "Test Item",
        description: "Test description",
        imageUrls: ["https://example.com/test.jpg"],
        basePrice: 9.99,
        isActive: true,
        prepMinutes: 9,
      });

      const before = (await getAdminItemDetail(created.id)).updatedAt;
      const updated = await updateItem(created.id, { basePrice: 12.25 });
      const after = (await getAdminItemDetail(created.id)).updatedAt;

      assert.equal(updated.basePrice, 12.25);
      assert.notEqual(before, after);
    },
  },
  {
    name: "menu: modifier validation rejects invalid rules",
    run: () => {
      assert.throws(() =>
        validateModifierGroupCreate({
          name: "Invalid Group",
          minSelect: 3,
          maxSelect: 1,
          isRequired: true,
        }),
      );
    },
  },
  {
    name: "cart: required modifiers are enforced when adding an item",
    run: async () => {
      resetMenuStoreForTests();
      resetCartStoreForTests();

      const bowl = (await listAdminItems({
        search: "Charred Chicken Bowl",
        page: 1,
        pageSize: 1,
      })).data[0];

      await assert.rejects(() =>
        addCartItem("user:test-required", {
          itemId: bowl.id,
          quantity: 1,
          selectedOptionIds: [],
          specialInstructions: "",
        }),
      );
    },
  },
  {
    name: "cart: update quantity and checkout preview compute totals",
    run: async () => {
      resetMenuStoreForTests();
      resetCartStoreForTests();

      const bowl = (await listAdminItems({
        search: "Charred Chicken Bowl",
        page: 1,
        pageSize: 1,
      })).data[0];
      const requiredGroup = bowl.modifierGroups.find((group) => group.isRequired || group.minSelect > 0);
      assert.ok(requiredGroup);
      const requiredOptionId = requiredGroup.options[0].id;

      let cart = await addCartItem("user:test-preview", {
        itemId: bowl.id,
        quantity: 1,
        selectedOptionIds: [requiredOptionId],
        specialInstructions: "Less spicy.",
      });

      const lineId = cart.items[0].id;
      cart = await updateCartItem("user:test-preview", lineId, { quantity: 2 });
      assert.equal(cart.itemCount, 2);

      const preview = await previewCheckout("user:test-preview", {
        orderType: "PICKUP",
        paymentMethod: "CARD",
      });

      assert.equal(preview.checkout.orderType, "PICKUP");
      assert.equal(preview.checkout.summary.subtotal > 0, true);
      assert.equal(preview.checkout.summary.total >= preview.checkout.summary.subtotal, true);
    },
  },
  {
    name: "checkout: minimum order is enforced for delivery",
    run: async () => {
      resetMenuStoreForTests();
      resetCartStoreForTests();

      const drink = (await listAdminItems({
        search: "Lime Mint Sparkler",
        page: 1,
        pageSize: 1,
      })).data[0];

      await addCartItem("user:test-min-order", {
        itemId: drink.id,
        quantity: 1,
        selectedOptionIds: [],
        specialInstructions: "",
      });

      await assert.rejects(() =>
        previewCheckout("user:test-min-order", {
          orderType: "DELIVERY",
          paymentMethod: "CARD",
          deliveryAddress: {
            line1: "1 Main St",
            city: "Austin",
          },
        }),
      );
    },
  },
];

let passed = 0;
let skipped = 0;
const databaseAvailable = await canConnectToDatabase();

for (const testCase of cases) {
  if (DB_REQUIRED_CASES.has(testCase.name) && !databaseAvailable) {
    skipped += 1;
    console.log(`SKIP: ${testCase.name} (database unavailable)`);
    continue;
  }

  try {
    await testCase.run();
    passed += 1;
    console.log(`PASS: ${testCase.name}`);
  } catch (error) {
    console.error(`FAIL: ${testCase.name}`);
    console.error(error);
    process.exitCode = 1;
  }
}

console.log(`\n${passed}/${cases.length} tests passed, ${skipped} skipped.`);
