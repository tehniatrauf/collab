import test from "node:test";
import assert from "node:assert/strict";

function roleFor(ownerId, userId, members) {
  if (ownerId === userId) return "Owner";
  return members.find((member) => member.userId === userId)?.role || null;
}

test("owner receives owner role", () => {
  assert.equal(roleFor("u1", "u1", []), "Owner");
});

test("shared member receives assigned role", () => {
  assert.equal(roleFor("u1", "u2", [{ userId: "u2", role: "Editor" }]), "Editor");
});

test("unknown member has no access", () => {
  assert.equal(roleFor("u1", "u3", []), null);
});
