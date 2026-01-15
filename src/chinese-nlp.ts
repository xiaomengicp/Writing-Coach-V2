/**
 * Chinese NLP module using segmentit for word segmentation and POS tagging
 * This is a pure JavaScript solution that works in Obsidian plugin environment
 */

import Segment from 'segmentit';

// Initialize segmentit
const segmentit = Segment();

// Word type constants from segmentit
// These are the POS (Part of Speech) tags used by segmentit
const POS = {
    // 名词类
    NOUN: 0x04000000,        // n 名词
    PERSON_NAME: 0x08000000, // nr 人名
    PLACE_NAME: 0x10000000,  // ns 地名
    ORG_NAME: 0x20000000,    // nt 机构团体
    OTHER_PROPER: 0x40000000,// nz 其它专名

    // 动词类
    VERB: 0x00800000,        // v 动词
    VERB_AUX: 0x01000000,    // vd 副动词
    VERB_N: 0x02000000,      // vn 名动词

    // 形容词类
    ADJ: 0x00100000,         // a 形容词
    ADJ_D: 0x00200000,       // ad 副形词
    ADJ_N: 0x00400000,       // an 名形词

    // 其他
    ADV: 0x00008000,         // d 副词
    PREP: 0x00010000,        // p 介词
    CONJ: 0x00020000,        // c 连词
    AUX: 0x00040000,         // u 助词
    MODAL: 0x00080000,       // e 叹词
};

/**
 * Result of Chinese text analysis
 */
export interface ChineseTextAnalysis {
    totalWords: number;
    adjectives: string[];
    verbs: string[];
    nouns: string[];
    adjectiveRatio: number;
    verbRatio: number;
    nounRatio: number;
}

/**
 * Analyze Chinese text using NLP
 */
export function analyzeChineseText(text: string): ChineseTextAnalysis {
    // Segment the text
    const segments = segmentit.doSegment(text);

    const adjectives: string[] = [];
    const verbs: string[] = [];
    const nouns: string[] = [];

    for (const seg of segments) {
        const word = seg.w;
        const pos = seg.p;

        // Check if adjective (a, ad, an)
        if ((pos & POS.ADJ) || (pos & POS.ADJ_D) || (pos & POS.ADJ_N)) {
            adjectives.push(word);
        }

        // Check if verb (v, vd, vn)
        if ((pos & POS.VERB) || (pos & POS.VERB_AUX) || (pos & POS.VERB_N)) {
            verbs.push(word);
        }

        // Check if noun (n, nr, ns, nt, nz)
        if ((pos & POS.NOUN) || (pos & POS.PERSON_NAME) || (pos & POS.PLACE_NAME) ||
            (pos & POS.ORG_NAME) || (pos & POS.OTHER_PROPER)) {
            nouns.push(word);
        }
    }

    const totalWords = segments.length;

    return {
        totalWords,
        adjectives,
        verbs,
        nouns,
        adjectiveRatio: totalWords > 0 ? adjectives.length / totalWords : 0,
        verbRatio: totalWords > 0 ? verbs.length / totalWords : 0,
        nounRatio: totalWords > 0 ? nouns.length / totalWords : 0
    };
}

/**
 * Simple check if text contains mostly Chinese characters
 */
export function isChineseText(text: string): boolean {
    const chineseChars = text.match(/[\u4e00-\u9fff]/g) || [];
    const totalChars = text.replace(/\s/g, '').length;
    return totalChars > 0 && (chineseChars.length / totalChars) > 0.5;
}

/**
 * Count Chinese characters in text
 */
export function countChineseChars(text: string): number {
    const matches = text.match(/[\u4e00-\u9fff]/g);
    return matches ? matches.length : 0;
}
