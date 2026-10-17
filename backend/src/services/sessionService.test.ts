import test from 'node:test';
import assert from 'node:assert/strict';
import { installFakeSessionModel } from '../test/fakeSession';
import { loadSession, mutateSession, writeSession } from './sessionService';

const SID = 'session-12345678';
const friend = { id: 'f1', name: 'Ann', paid: false };

test('a client that never loaded data cannot overwrite existing data', async () => {
    const { store } = installFakeSessionModel();
    const initial = await loadSession(SID);
    await writeSession(SID, initial.version, { friends: [friend], orders: [], paidDebts: [] });

    // Slow browser: still holds version 0 and an empty state, tries to save it.
    const stale = await writeSession(SID, 0, { friends: [], orders: [], paidDebts: [] });

    assert.equal(stale.ok, false);
    assert.equal(stale.session.friends.length, 1);
    assert.equal(store.get(SID).friends.length, 1);
});

test('a write with the current version succeeds and bumps the version', async () => {
    installFakeSessionModel();
    const s0 = await loadSession(SID);
    const written = await writeSession(SID, s0.version, { friends: [friend], orders: [], paidDebts: [] });
    assert.equal(written.ok, true);
    assert.equal(written.session.version, 1);
});

test('legacy documents without a version field are treated as version 0', async () => {
    const { store } = installFakeSessionModel();
    store.set(SID, { sessionId: SID, friends: [friend], orders: [] });
    const loaded = await loadSession(SID);
    assert.equal(loaded.version, 0);
    const written = await writeSession(SID, 0, { friends: [], orders: [], paidDebts: [] });
    assert.equal(written.ok, true);
});

test('concurrent mutations never lose each other\'s changes', async () => {
    installFakeSessionModel();
    await loadSession(SID);
    await Promise.all(
        ['Ann', 'Bob', 'Cat', 'Dan'].map((name, i) =>
            mutateSession(SID, (draft) => {
                draft.friends.push({ id: `f${i}`, name, paid: false });
            })
        )
    );
    const final = await loadSession(SID);
    assert.deepEqual(final.friends.map((f) => f.name).sort(), ['Ann', 'Bob', 'Cat', 'Dan']);
    assert.equal(final.version, 4);
});

test('reading a session never creates it; the first write does', async () => {
    const { store } = installFakeSessionModel();
    const empty = await loadSession(SID);
    assert.equal(empty.version, 0);
    assert.equal(store.size, 0);

    const written = await writeSession(SID, 0, { friends: [friend], orders: [], paidDebts: [] });
    assert.equal(written.ok, true);
    assert.equal(written.session.version, 1);
    assert.equal(store.size, 1);
});

test('two first writes racing: one creates, the other gets a conflict', async () => {
    installFakeSessionModel();
    const [a, b] = await Promise.all([
        writeSession(SID, 0, { friends: [friend], orders: [], paidDebts: [] }),
        writeSession(SID, 0, { friends: [], orders: [], paidDebts: [] }),
    ]);
    assert.deepEqual([a.ok, b.ok].sort(), [false, true]);
});
