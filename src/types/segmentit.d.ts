// Type declarations for third-party modules without types

declare module 'segmentit' {
    interface SegmentResult {
        w: string;  // word
        p: number;  // POS (part of speech) tag
    }

    interface SegmentInstance {
        doSegment(text: string): SegmentResult[];
    }

    function Segment(): SegmentInstance;
    export default Segment;
}
