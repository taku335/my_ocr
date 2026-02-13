import { detectLongLineMask } from "./preprocessImage";

function indexFor(x: number, y: number, width: number): number {
  return y * width + x;
}

describe("detectLongLineMask", () => {
  it("marks long horizontal and vertical runs as table lines", () => {
    const width = 8;
    const height = 8;
    const binary = new Uint8Array(width * height);

    for (let x = 0; x < width; x += 1) {
      binary[indexFor(x, 1, width)] = 1;
    }

    for (let y = 0; y < height; y += 1) {
      binary[indexFor(6, y, width)] = 1;
    }

    binary[indexFor(1, 6, width)] = 1;
    binary[indexFor(2, 6, width)] = 1;
    binary[indexFor(3, 6, width)] = 1;

    const lineMask = detectLongLineMask(binary, width, height, 7, 7);

    expect(lineMask[indexFor(0, 1, width)]).toBe(1);
    expect(lineMask[indexFor(7, 1, width)]).toBe(1);
    expect(lineMask[indexFor(6, 0, width)]).toBe(1);
    expect(lineMask[indexFor(6, 7, width)]).toBe(1);
    expect(lineMask[indexFor(1, 6, width)]).toBe(0);
    expect(lineMask[indexFor(2, 6, width)]).toBe(0);
    expect(lineMask[indexFor(3, 6, width)]).toBe(0);
  });

  it("throws when binary size does not match image shape", () => {
    const binary = new Uint8Array(10);
    expect(() => detectLongLineMask(binary, 4, 4, 2, 2)).toThrow(
      "binaryマスクのサイズが画像サイズと一致しません。"
    );
  });
});
