const fs = require('node:fs');
const path = require('node:path');

const collectionPath = path.resolve(__dirname, '../postman/Trex Launchpad Backend.postman_collection.json');
const collection = JSON.parse(fs.readFileSync(collectionPath, 'utf8'));

const variableDefaults = {
  chainUid: '60000000-0000-4000-8000-000000000001',
  chainId: '11155111',
  paymentTokenUid: '',
  chainDeployerPrivateKey: '',
};
for (const [key, value] of Object.entries(variableDefaults)) {
  if (!collection.variable.some((item) => item.key === key)) {
    collection.variable.push({ key, value, type: 'string' });
  }
}

const bearer = (variable) => ({
  type: 'bearer', bearer: [{ key: 'token', value: `{{${variable}}}`, type: 'string' }],
});
const jsonBody = (value) => ({
  mode: 'raw', raw: JSON.stringify(value, null, 2), options: { raw: { language: 'json' } },
});
const request = (name, method, url, { auth, body, description } = {}) => ({
  name,
  request: {
    ...(auth ? { auth } : {}), method,
    header: body ? [{ key: 'Content-Type', value: 'application/json' }] : [],
    ...(body ? { body: jsonBody(body) } : {}), url: `{{baseUrl}}/api/v1${url}`,
    ...(description ? { description } : {}),
  },
});
const imageRequest = (name, url, auth) => ({
  name,
  request: {
    auth, method: 'PUT', header: [],
    body: { mode: 'formdata', formdata: [{ key: 'image', type: 'file', src: [] }] },
    url: `{{baseUrl}}/api/v1${url}`,
    description: 'Upload PNG, JPEG, WebP, or safe SVG as multipart field image (maximum 2 MB).',
  },
});

const folder = {
  name: 'Multichain Configuration',
  item: [
    request('List Supported Chains', 'GET', '/chains', { auth: { type: 'noauth' } }),
    request('My Chain Access', 'GET', '/chains/me', { auth: bearer('userToken') }),
    request('Unlock Chain ONCHAINID', 'POST', '/chains/{{chainUid}}/unlock', {
      auth: bearer('userToken'), body: {},
      description: 'Issuer/Investor only. Idempotently creates ONCHAINID for a completed profile on the selected chain.',
    }),
    request('Supported Payment Tokens', 'GET', '/payment-tokens?chainUid={{chainUid}}&action=PURCHASE', { auth: { type: 'noauth' } }),
    request('Admin - List Chains', 'GET', '/admin/chains?page=1&limit=20', { auth: bearer('adminToken') }),
    request('Admin - Get Chain', 'GET', '/admin/chains/{{chainUid}}', { auth: bearer('adminToken') }),
    request('Admin - Create Chain', 'POST', '/admin/chains', {
      auth: bearer('adminToken'),
      description: 'The private key is write-only and encrypted by the backend. Never export a real key in a shared Postman environment.',
      body: {
        chainCode: 'AMOY', chainName: 'Polygon Amoy', chainId: 80002, networkName: 'amoy',
        nativeCurrencyName: 'POL', nativeCurrencySymbol: 'POL', nativeCurrencyDecimals: 18,
        rpcUrl: 'https://rpc-amoy.polygon.technology', publicRpcUrl: 'https://rpc-amoy.polygon.technology',
        explorerUrl: 'https://amoy.polygonscan.com', identityFactoryAddress: '0x0000000000000000000000000000000000000001',
        platformControllerAddress: '0x0000000000000000000000000000000000000002',
        trexFactoryAddress: '0x0000000000000000000000000000000000000003',
        deployerPrivateKey: '{{chainDeployerPrivateKey}}', confirmations: 2, registryConfirmations: 2,
        indexersEnabled: true, isTestnet: true, isDefault: false, isActive: true,
      },
    }),
    request('Admin - Update Chain', 'PATCH', '/admin/chains/{{chainUid}}', {
      auth: bearer('adminToken'), body: {
        publicRpcUrl: 'https://rpc-amoy.polygon.technology', explorerUrl: 'https://amoy.polygonscan.com',
        fallbackRpcUrls: ['https://fallback-rpc.example'], isActive: true,
      },
    }),
    imageRequest('Admin - Add or Replace Chain Image', '/admin/chains/{{chainUid}}/image', bearer('adminToken')),
    request('Admin - Chain Audit History', 'GET', '/admin/chains/{{chainUid}}/audits?page=1&limit=20', { auth: bearer('adminToken') }),
    request('Admin - List Payment Tokens', 'GET', '/admin/payment-tokens?chainUid={{chainUid}}&page=1&limit=20', { auth: bearer('adminToken') }),
    request('Admin - Get Payment Token', 'GET', '/admin/payment-tokens/{{paymentTokenUid}}', { auth: bearer('adminToken') }),
    request('Admin - Create Payment Token', 'POST', '/admin/payment-tokens', {
      auth: bearer('adminToken'),
      body: {
        chainUid: '{{chainUid}}', paymentTokenCode: 'USDC', paymentTokenName: 'USD Coin',
        paymentTokenSymbol: 'USDC', contractAddress: '0x0000000000000000000000000000000000000004',
        decimals: 6, supportsPurchase: true, supportsRedemption: true, isDefault: false,
        displayOrder: 20, isActive: true,
      },
    }),
    request('Admin - Update Payment Token', 'PATCH', '/admin/payment-tokens/{{paymentTokenUid}}', {
      auth: bearer('adminToken'), body: { paymentTokenName: 'USD Coin', displayOrder: 20, isActive: true },
    }),
    imageRequest('Admin - Add or Replace Payment Token Image', '/admin/payment-tokens/{{paymentTokenUid}}/image', bearer('adminToken')),
    request('Admin - Delete Payment Token', 'DELETE', '/admin/payment-tokens/{{paymentTokenUid}}', { auth: bearer('adminToken') }),
  ],
};

const existingIndex = collection.item.findIndex((item) => item.name === folder.name);
if (existingIndex >= 0) collection.item[existingIndex] = folder;
else collection.item.push(folder);

for (const [folderName, requestName] of [
  ['Organization Onboarding', 'Submit Organization'],
  ['Investor Onboarding', 'Submit Investor Onboarding'],
]) {
  const item = collection.item.find((entry) => entry.name === folderName)?.item.find((entry) => entry.name === requestName);
  if (item?.request?.body?.mode === 'raw') {
    const body = JSON.parse(item.request.body.raw);
    body.chainUid = '{{chainUid}}';
    item.request.body.raw = JSON.stringify(body, null, 2);
  }
}

const tokenInformation = collection.item.find((entry) => entry.name === 'Token Creation')
  ?.item.find((entry) => entry.name === 'Step 1 - Save Token Information and Image');
if (tokenInformation?.request?.body?.mode === 'formdata'
  && !tokenInformation.request.body.formdata.some((entry) => entry.key === 'chainUid')) {
  tokenInformation.request.body.formdata.unshift({ key: 'chainUid', value: '{{chainUid}}', type: 'text' });
}

const multichainDescription = 'Multichain runtime configuration is database-backed; use the Multichain Configuration folder and never export real signer secrets.';
if (!collection.info.description.includes(multichainDescription)) {
  collection.info.description += ` ${multichainDescription}`;
}
fs.writeFileSync(collectionPath, `${JSON.stringify(collection, null, 2)}\n`);
