export type Size = 's' | 'm' | 'l';
export const remToPxl = (rem: number) =>
  Math.floor(rem * parseFloat(getComputedStyle(document.documentElement).fontSize));

export const sizeToPxl = (size: Size) => {
  switch (size) {
    case 'l':
      return remToPxl(4.8); // e.g. 143px
    case 'm':
      return remToPxl(3.4); // e.g. 101px
    case 's':
    default:
      return remToPxl(2);   // e.g. 59px
  }
};

export const fieldContainerSizeToPxl = (size: Size) => {
  switch (size) {
    case 'l':
      return remToPxl(4.2); // e.g. 126px
    case 'm':
      return remToPxl(2.8); // e.g. 84px
    case 's':
    default:
      return remToPxl(1.4); // e.g. 42px
  }
};
