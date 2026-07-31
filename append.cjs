const fs = require('fs');
let css = fs.readFileSync('src/index.css', 'utf8');

const additionalCss = `
/* Remove number input spinners */
input[type='number'].no-spinners::-webkit-inner-spin-button,
input[type='number'].no-spinners::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
input[type='number'].no-spinners {
  -moz-appearance: textfield;
}
`;

fs.writeFileSync('src/index.css', css + additionalCss);
