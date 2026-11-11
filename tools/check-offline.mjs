import assert from 'node:assert/strict';
import { offlineReward } from '../src/economy.js';

for (const price of [15, 100, 650, 1500, 9000, 13500]) {
  for (const rate of [1, 10, 100, 1000]) {
    const night = offlineReward(12 * 3600, rate, price);
    assert.equal(night, offlineReward(30 * 60, rate, price));
    assert.equal(night, offlineReward(7 * 86400, rate, price));
    assert.ok(night * 2 <= price * .4, 'A doubled return bonus must not skip the next unlock');
  }
}
assert.equal(offlineReward(119, 100, 9000), 0);
assert.equal(offlineReward(-10, 100, 9000), 0);
assert.equal(offlineReward(3600, 0, 9000), 0);
assert.equal(offlineReward(NaN, 100, 9000), 0);
assert.equal(offlineReward(120, 1, 1000), 6);
console.log('Offline rewards: overnight/week-long absences, x2, early return and invalid clocks checked.');
