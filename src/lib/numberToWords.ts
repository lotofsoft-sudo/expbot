/**
 * Converts numbers into English Words for Saudi Riyals (SAR) & Halalas
 */
const ones = [
  '',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
  'Thirteen',
  'Fourteen',
  'Fifteen',
  'Sixteen',
  'Seventeen',
  'Eighteen',
  'Nineteen'
];

const tens = [
  '',
  '',
  'Twenty',
  'Thirty',
  'Forty',
  'Fifty',
  'Sixty',
  'Seventy',
  'Eighty',
  'Ninety'
];

function convertLessThanThousand(num: number): string {
  if (num === 0) return '';
  if (num < 20) return ones[num];
  if (num < 100) {
    const rem = num % 10;
    return tens[Math.floor(num / 10)] + (rem !== 0 ? ' ' + ones[rem] : '');
  }
  const rem = num % 100;
  return (
    ones[Math.floor(num / 100)] +
    ' Hundred' +
    (rem !== 0 ? ' and ' + convertLessThanThousand(rem) : '')
  );
}

export function numberToSarWords(amount: number): string {
  if (isNaN(amount) || amount === 0) return 'Zero Saudi Riyals Only';

  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);
  const wholePart = Math.floor(absAmount);
  const decimalPart = Math.round((absAmount - wholePart) * 100);

  const thousands = ['', ' Thousand', ' Million', ' Billion'];
  let currentNum = wholePart;
  let words = '';
  let thousandIndex = 0;

  if (wholePart === 0) {
    words = 'Zero';
  } else {
    while (currentNum > 0) {
      const chunk = currentNum % 1000;
      if (chunk !== 0) {
        const chunkWords = convertLessThanThousand(chunk);
        words = chunkWords + thousands[thousandIndex] + (words ? ' ' + words : '');
      }
      currentNum = Math.floor(currentNum / 1000);
      thousandIndex++;
    }
  }

  let result = (isNegative ? 'Negative ' : '') + words + ' Saudi Riyals';

  if (decimalPart > 0) {
    result += ` and ${convertLessThanThousand(decimalPart)} Halalas`;
  }

  return result + ' Only';
}
