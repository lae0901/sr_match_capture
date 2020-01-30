interface onMatch_interface {
    (options: {
        capture_object: {} | undefined;
        match_text: string;
    }): void;
}
export interface captureItem_interface {
    bx: number;
    lx: number;
    name?: string;
    text?: string;
    obj?: captureObject_interface;
}
interface captureObjectMeta_interface {
    [key: string]: captureItem_interface;
    [key: number]: captureItem_interface;
}
export interface captureObject_interface {
    meta?: captureObjectMeta_interface;
    [key: string]: string | captureObject_interface | any;
    [key: number]: string | captureObject_interface;
}
interface repeatItem_interface {
    method(parm1: any, parm2?: any): any;
    parm1: any | undefined;
    parm2?: any | undefined;
}
export interface MatchCapture_options {
    parent?: MatchCapture | undefined;
    name?: string | undefined;
    matchFail?: boolean | undefined;
    bypassAll?: boolean | undefined;
    capture_object?: captureObject_interface;
    capture_array?: {}[] | undefined;
    capture_meta_array?: {}[] | undefined;
    captureName?: string;
    doCapture?: boolean;
    captureToArray?: boolean | undefined;
    isOr?: boolean;
    isRepeatRun?: boolean;
    noIncSeqn?: boolean;
    peek?: boolean;
    peekNextText?: string;
    peekNextNotText?: string;
    repeatable?: boolean;
    skipSetup?: boolean;
    zeroMatchOk?: boolean;
    zeroMatchBreak?: boolean;
    zeroMoreWhitespace?: boolean;
    onMatch?: onMatch_interface;
    breakOut?: boolean;
    captureMatchText_propertyName?: string;
}
export declare class MatchCapture {
    text: string;
    index: number;
    isMatch: boolean;
    matchFail: boolean;
    start: number;
    instructSeqn: number;
    skipSeqn: number;
    orSeqn: number;
    bypassAll: boolean;
    breakOut: boolean;
    bypassNext: string;
    current: {} | null;
    parent: MatchCapture | undefined;
    name: string | undefined;
    capture_meta_array: {}[] | undefined;
    captureName?: string;
    doCapture?: boolean;
    capture_object: captureObject_interface;
    capture_array: {}[] | undefined;
    captureToArray: boolean | undefined;
    capture: MatchCapture[] | undefined;
    errmsg?: string;
    repeat?: repeatItem_interface[];
    constructor(text: string, index: number, options: MatchCapture_options);
    angleBracketName(options?: MatchCapture_options): this;
    captureBegin(options?: MatchCapture_options): MatchCapture;
    captureEnd(options?: MatchCapture_options): MatchCapture;
    captureEndZeroOne(): MatchCapture;
    closeParen(): MatchCapture;
    endOfLine(): this;
    eof(options: MatchCapture_options): this;
    getMatch(): string;
    instructionSetup(options?: MatchCapture_options): boolean;
    identifier(options?: MatchCapture_options): this;
    literal(options?: MatchCapture_options): this;
    matchText(matchText: string | string[], options?: MatchCapture_options): this;
    match_processMatchFalse(options: MatchCapture_options): void;
    match_processMatchTrue(options: MatchCapture_options, bx: number, lx: number): void;
    matchRegExp(regexp: string | RegExp, options?: MatchCapture_options): this;
    nameStartOneMore(): this;
    oneMoreDigits(options?: {}): this;
    oneMoreWhitespace(): this;
    openParen(options?: MatchCapture_options): MatchCapture;
    or(options?: MatchCapture_options): this;
    static peekNext(text: string, ix: number, match: string | string[]): boolean;
    repeatMatch(options?: MatchCapture_options): this;
    repeatMatchText(matchText: string, options: MatchCapture_options): this;
    repeat_runMethod(): void;
    restore_capture(saved_capture: captureObject_interface): void;
    ruxRoutine(userRoutine: (matchCapture: MatchCapture, ix: number) => void): void;
    runRoutine(userRoutine: (matchCapture: MatchCapture, options: MatchCapture_options) => void, options: MatchCapture_options): this;
    was_ruyRoutine(userRoutine: any, options: MatchCapture_options): this;
    setup_capture(capture_object: {}): captureObject_interface;
    store_capture(item: captureItem_interface, toArray?: boolean, errmsg?: string): void;
    store_capture_object(captureName: string, item: captureItem_interface): void;
    store_capture_array(item: captureItem_interface): void;
    old_storx_capture(captureName: string, captureToArray: boolean, cap: {}, bx: number, lx: number, errmsg?: string, cap_meta_array?: {}): void;
    until(untilText: string, include?: string): this;
    zeroMoreWhitespace(options?: MatchCapture_options): this;
}
export {};
