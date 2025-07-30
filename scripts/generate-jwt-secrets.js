const crypto = require('crypto');

console.log('Generate secure JWT secrets for your .env file:\n');

const jwtSecret = crypto.randomBytes(64).toString('hex');
const jwtRefreshSecret = crypto.randomBytes(64).toString('hex');

console.log(`JWT_SECRET=${jwtSecret}`);
console.log(`JWT_REFRESH_SECRET=${jwtRefreshSecret}`);
console.log('\nCopy these values to your .env file');
console.log('\nIMPORTANT: Keep these secrets secure and never commit them to version control!');