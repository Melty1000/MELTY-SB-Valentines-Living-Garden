export interface VinePoint {
    x: number;
    y: number;
    thickness: number;
    len: number;
    warp: number;
    nx: number; // Pre-calculated normal X
    ny: number; // Pre-calculated normal Y
}

export interface StrandPoint {
    x: number;
    y: number;
    t: number;
}

export interface ThornData {
    t: number;
    strandIdx: number;
    angleOffset: number;
    size: number;
}

export interface LeafData {
    t: number;
    strandIdx: number;
    angleOffset: number;
    size: number;
    flip: boolean;
}

export interface TwigData {
    t: number;
    strandIdx: number;
    angleOffset: number;
    length: number;
    curls: number;
    curlSign: number;
}

export interface AttachmentPoint {
    t: number;
    strandIdx: number;
    occupied: boolean;
    slotIdx: number;
}
