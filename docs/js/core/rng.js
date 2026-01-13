// Seeded random number generator (Mulberry32)
export function createRng(seed) {
    if (seed === null || seed === undefined) {
        seed = Math.floor(Math.random() * 2147483647);
    }
    return function() {
        let t = seed += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
}

export function randomUniform(rng, min, max) {
    return min + rng() * (max - min);
}

export function shuffleArray(rng, array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}
