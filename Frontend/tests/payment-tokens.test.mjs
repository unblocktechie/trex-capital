import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizePaymentTokens, paymentContextOf } from '../src/config/payment-tokens.js';
import { parseExactUnits, calculatePaymentRaw } from '../src/utils/paymentAmounts.js';
const address='0x1111111111111111111111111111111111111111';
const controller='0x2222222222222222222222222222222222222222';
test('catalogue normalizes metadata and preserves inactive rows for explicit validation',()=>{
 const rows=normalizePaymentTokens({paymentTokens:[{contractAddress:address,platformControllerAddress:controller,symbol:'COIN',decimals:18,chainId:11155111,active:true,supportedActions:['PURCHASE','REDEMPTION']}]});
 assert.equal(rows[0].contractAddress,address); assert.equal(rows[0].controllerAddress,controller); assert.equal(rows[0].decimals,18);assert.equal(rows[0].active,true);
 assert.equal(normalizePaymentTokens([{contractAddress:address,symbol:'OFF',decimals:6,chainId:11155111,active:false}])[0].active,false);
});
test('currency identity is taken from saved generic fields, never USDT aliases',()=>{
 assert.deepEqual(paymentContextOf({raw:{paymentTokenAddress:address,platformControllerAddress:controller,paymentTokenSymbol:'COIN'}}),{paymentTokenAddress:address,controllerAddress:controller,paymentTokenSymbol:'COIN'});
 assert.equal(paymentContextOf({usdtContractAddress:address}).paymentTokenAddress,'');
 assert.equal(paymentContextOf({metadata:{platformController:controller}}).controllerAddress,controller);
 assert.equal(paymentContextOf({paymentToken:{controllerAddress:controller}}).controllerAddress,controller);
 assert.deepEqual(
  paymentContextOf({information:{paymentTokenAddress:address,platformControllerAddress:controller,paymentTokenSymbol:'COIN'}}),
  {paymentTokenAddress:address,controllerAddress:controller,paymentTokenSymbol:'COIN'},
 );
 assert.deepEqual(
  paymentContextOf({asset:{paymentTokenAddress:address,platformControllerAddress:controller,paymentTokenSymbol:'COIN'}}),
  {paymentTokenAddress:address,controllerAddress:controller,paymentTokenSymbol:'COIN'},
 );
 assert.deepEqual(
  paymentContextOf({interest:{raw:{paymentTokenAddress:address,platformControllerAddress:controller,paymentTokenSymbol:'COIN'}}}),
  {paymentTokenAddress:address,controllerAddress:controller,paymentTokenSymbol:'COIN'},
 );
});
test('amount conversion rejects precision loss and quotes match both contract divisions',()=>{
 assert.throws(()=>parseExactUnits('1.0000001',6));
 assert.equal(parseExactUnits('1.000000',6),1000000n);
 assert.equal(calculatePaymentRaw(2500000000000000000n,12345678n,18,6,6),30864195n);
 assert.equal(calculatePaymentRaw(2500000000000000000n,12345678n,18,18,6),30864195000000000000n);
 assert.equal(calculatePaymentRaw(123456789000000000n,1000000n,18,18,6),123456000000000000n);
});
