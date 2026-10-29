import test from 'node:test';
import assert from 'node:assert/strict';
import {
  escapeHtml,
  buildKycPendingMessage,
  buildPropertyPendingMessage,
  buildPurchaseRequestMessage,
  buildBidMessage,
  buildAuctionWonMessage,
  buildReservationPaidMessage,
  buildLiveChatMessage,
} from './telegramOpsNotify.js';

test('escapeHtml escapes markup', () => {
  assert.equal(escapeHtml('<b>&x</b>'), '&lt;b&gt;&amp;x&lt;/b&gt;');
});

test('buildKycPendingMessage includes user and doc', () => {
  const text = buildKycPendingMessage({
    userId: 42,
    name: 'Иван <Test>',
    role: 'buyer',
    documentType: 'passport',
    documentId: 7,
  });
  assert.match(text, /KYC pending review/);
  assert.match(text, /#42/);
  assert.match(text, /Иван &lt;Test&gt;/);
  assert.match(text, /passport/);
  assert.match(text, /#7/);
});

test('buildPropertyPendingMessage includes auction flag', () => {
  const text = buildPropertyPendingMessage({
    propertyId: 10,
    title: 'Villa',
    propertyType: 'house',
    is_auction: 1,
    user_id: 3,
  });
  assert.match(text, /Listing pending moderation/);
  assert.match(text, /#10/);
  assert.match(text, /Auction: yes/);
  assert.match(text, /#3/);
});

test('buildPurchaseRequestMessage includes price and buyer', () => {
  const text = buildPurchaseRequestMessage({
    requestId: 99,
    propertyTitle: 'Apt',
    amount: 150000,
    currency: 'EUR',
    buyerName: 'Anna',
    buyerPhone: '+34111',
  });
  assert.match(text, /Purchase request/);
  assert.match(text, /#99/);
  assert.match(text, /150/);
  assert.match(text, /Anna/);
});

test('buildBidMessage includes bidder and amount', () => {
  const text = buildBidMessage({
    propertyId: 5,
    title: 'Lot',
    amount: 12000,
    currency: 'EUR',
    userId: 8,
    userName: 'Bob',
  });
  assert.match(text, /Bid/);
  assert.match(text, /#5/);
  assert.match(text, /12/);
  assert.match(text, /#8/);
  assert.match(text, /Bob/);
});

test('buildAuctionWonMessage and reservation paid', () => {
  const won = buildAuctionWonMessage({
    propertyId: 1,
    title: 'X',
    amount: 1000,
    userId: 2,
    depositDueDate: '2030-01-01T00:00:00.000Z',
  });
  assert.match(won, /Auction won/);
  assert.match(won, /#2/);

  const paid = buildReservationPaidMessage({
    purchaseRequestId: 11,
    propertyId: 22,
    buyerId: 33,
    sellerId: 44,
  });
  assert.match(paid, /Reservation paid/);
  assert.match(paid, /#11/);
});

test('buildLiveChatMessage includes from, when and message', () => {
  const text = buildLiveChatMessage({
    sessionId: 12,
    userId: 53,
    text: 'Need help with <auction>',
    createdAt: '2026-09-18T00:15:00+03:00',
    clientFirstName: 'Иван',
    clientLastName: 'Петров',
    clientEmail: 'ivan@example.com',
    clientPhone: '+34111',
  });
  assert.match(text, /New support chat message/);
  assert.match(text, /From: Иван Петров \(#53\)/);
  assert.match(text, /Email: ivan@example.com/);
  assert.match(text, /Phone: \+34111/);
  assert.match(text, /When: 18 September 2026 at 00:15/);
  assert.match(text, /Message: Need help with &lt;auction&gt;/);
  assert.doesNotMatch(text, /Session #/);
});

test('buildLiveChatMessage truncates long preview and labels guest', () => {
  const long = 'a'.repeat(900);
  const text = buildLiveChatMessage({
    sessionId: 1,
    text: long,
    createdAt: '2026-09-18T00:15:00+03:00',
  });
  assert.match(text, /From: guest/);
  assert.match(text, /When:/);
  assert.match(text, /Message:/);
  assert.ok(text.includes('…'));
  assert.ok(!text.includes('a'.repeat(810)));
});
