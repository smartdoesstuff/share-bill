import test from 'node:test';
import assert from 'node:assert/strict';
import { installFakeSessionModel } from '../test/fakeSession';
import { getOrCreateSession, mutateSession, writeSession } from './sessionService';

const SID = 'session-12345678';
const friend = { id: 'f1', name: 'Ann', paid: false };

test('a client that never loaded data cannot overwrite existing data', async () => {
    const { store } = installFakeSessionModel();
    const initial = await getOrCreateSession(SID);
    await writeSession(SID, initial.version, { friends: [friend], orders: [], paidDebts: [] });

    // Slow browser: still holds version 0 and an empty state, tries to save it.
    const stale = await writeSession(SID, 0, { friends: [], orders: [], paidDebts: [] });

    assert.equal(stale.ok, false);
    assert.equal(stale.session.friends.length, 1);
    assert.equal(store.get(SID).friends.length, 1);
});

test('a write with the current version succeeds and bumps the version', async () => {
    installFakeSessionModel();
    const s0 = await getOrCreateSession(SID);
    const written = await writeSession(SID, s0.version, { friends: [friend], orders: [], paidDebts: [] });
    assert.equal(written.ok, true);
    assert.equal(written.session.version, 1);
});

test('legacy documents without a version field are treated as version 0', async () => {
    const { store } = installFakeSessionModel();
    store.set(SID, { sessionId: SID, friends: [friend], orders: [] });
    const loaded = await getOrCreateSession(SID);
    assert.equal(loaded.version, 0);
    const written = await writeSession(SID, 0, { friends: [], orders: [], paidDebts: [] });
    assert.equal(written.ok, true);
});

test('concurrent mutations never lose each other\'s changes', async () => {
    installFakeSessionModel();
    await getOrCreateSession(SID);
    await Promise.all(
        ['Ann', 'Bob', 'Cat', 'Dan'].map((name, i) =>
            mutateSession(SID, (draft) => {
                draft.friends.push({ id: `f${i}`, name, paid: false });
            })
        )
    );
    const final = await getOrCreateSession(SID);
    assert.deepEqual(final.friends.map((f) => f.name).sort(), ['Ann', 'Bob', 'Cat', 'Dan']);
    assert.equal(final.version, 4);
});
