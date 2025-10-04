import { getMonth, getQuarter, getYear } from "date-fns";

export const groupByMonth = (data, key = "value") => {
  const map = {};
  for (const d of data) {
    const month = getMonth(new Date(d.date)) + 1; // 1..12
    map[month] = (map[month] || 0) + (Number(d[key]) || 0);
  }

  // ✅ đảm bảo có đủ 12 tháng, nếu chưa có thì gán 0
  const result = [];
  for (let m = 1; m <= 12; m++) {
    result.push({
      name: `Tháng ${m}`,
      [key]: map[m] || 0,
    });
  }
  return result;
};

export const groupByQuarter = (data, key = "value") => {
  const map = {};
  for (const d of data) {
    const q = getQuarter(new Date(d.date)); // 1..4
    map[q] = (map[q] || 0) + (Number(d[key]) || 0);
  }

  const result = [];
  for (let q = 1; q <= 4; q++) {
    result.push({
      name: `Quý ${q}`,
      [key]: map[q] || 0,
    });
  }
  return result;
};

export const groupByYear = (data, key = "value") => {
  const map = {};
  for (const d of data) {
    const y = getYear(new Date(d.date));
    map[y] = (map[y] || 0) + (Number(d[key]) || 0);
  }

  return Object.keys(map)
    .map(Number)
    .sort((a, b) => a - b)
    .map((y) => ({
      name: `${y}`,
      [key]: map[y],
    }));
};
