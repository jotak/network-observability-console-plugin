import { getService } from 'port-numbers';

export const formatPort = (p: number) => {
  const service = getService(p);
  if (service) {
    return `${service.name} (${p})`;
  } else {
    return String(p);
  }
};

// This sort is ordering first the port with a known service
// then order numerically the other port
export const comparePorts = (p1: number, p2: number) => {
  const s1 = getService(p1);
  const s2 = getService(p2);
  if (s1 && s2) {
    return formatPort(p1).localeCompare(formatPort(p2));
  }
  if (s1) {
    return -1;
  }
  if (s2) {
    return 1;
  }
  return p1 - p2;
};
