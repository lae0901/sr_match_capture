// @copyright, 2020, stephen richter stephenrichter@gmail.com  all rights reserved.

// coder/tester/parse-code/match-capture.js
// date: 2019-09-15
// desc: text match functions

// methods:
// captureBegin({capture_object, captureName })
// captureEnd( zeroMatchOk = false )
// captureEndZeroOne( )
// closeParen( )
// endOfLine( )
// identifier( {captureName} )  // match identifier name. 
// match( text )
// matchRegExp( regexp_text, {captureName} )
// openParen( )
// or( )
// runRoutine( routine )
// nameStartOneMore( )
// until( untilText, includeText:Y N ) 
// zeroMoreWhitespace( )

// admin methods:
// restore_capture(saved_capture)
// setup_capture( capture_object )  
// store_capture( captureName, captureToArray, bx, lx, errmsg )

// capture object
// 1. the idea is that matches in a string are labeled with a name and captured to
//    the capture_object in a property with that name.
// 2. matches that repeat, such as a CSV sequence of words, are also stored in the
//    capture_object. Only, the capture name of repeat matches is a sequential 
//    indexer number.
// 3. in general, matches are stored in the capture_object by name or indexer.
//    Use the store_captureObject method. If captureName is falsy, store the match
//    using the next sequential indexer value.

// capture rules and ideas
//  1. matching is done using the matchText method
//  2. an options parm is passed to matchText. 
//     { captureName:string, doCapture:boolean }
//  3. when captureName specified, the capture text is captured to the captureName 
//     property of capture_object. When doCapture:true, the capture is done to the
//     capture_array property. 
// note: a match does not have to be captured. Can just be used to enable matching
//       to continue.

import {scan_charNeAll, rxp, regex_exec} from 'sr_core_ts';
export { iMatchCapture, iMatchItem, matchArr_match } from './array-match';

interface onMatch_interface
{
  (options:{capture_object: {} | undefined, match_text:string}): void;
}

export interface captureItem_interface
{
  bx:number,
  lx:number,
  name?: string,
  text?: string,
  obj?: captureObject_interface,
}

interface captureObjectMeta_interface 
{
  [key: string]: captureItem_interface,
  [key: number]: captureItem_interface
}

// remove meta property once no longer used in code.
export interface captureObject_interface 
{
  meta?: captureObjectMeta_interface,
  [key: string]: string | captureObject_interface | any
  [key: number]: string | captureObject_interface
}

interface repeatItem_interface
{
  method( parm1:any, parm2?:any): any,
  parm1: any | undefined,
  parm2?: any | undefined
}

interface repeatItem_function
{
  (source: string, subString: string): boolean;
}

export interface MatchCapture_options 
{
  parent?: MatchCapture | undefined  ;
  name?: string | undefined;
  matchFail?: boolean | undefined ;
  bypassAll?: boolean | undefined ;
  capture_object?: captureObject_interface;
  capture_array?: {}[] | undefined;
  capture_meta_array?: {}[] | undefined;
  captureName?: string;
  doCapture?: boolean;
  captureToArray?: boolean | undefined;
  isOr?: boolean;
  isRepeatRun?:boolean;
  noIncSeqn?: boolean ;
  peek?: boolean;
  peekNextText?: string,
  peekNextNotText?:string;
  repeatable?: boolean;
  skipSetup?: boolean;

  // match the text. But, if no match, this is ok. Allow to continue matching.
  // example use:  the * operator after a c variable name. Used to dereference a
  //               pointer. But, stil continue the match if not found.
  zeroMatchOk?: boolean;

  // zeroMatchBreak. If not a match, handle as match that ends with prior match.
  zeroMatchBreak?: boolean;
  
  zeroMoreWhitespace?: boolean;
  onMatch?: onMatch_interface;

  // breakOut: when true, execute no more instructions within capture group.
  breakOut?: boolean;

  // when a match, capture the match text and store in this propertyName in the
  // capture_object.
  captureMatchText_propertyName?:string;
}

// ------------------------------- MatchCapture --------------------------------
// parent: parent MatchCapture. captures within a match sequence are stored as
//         MatchCapture objects stored in the capture array. Use the parent property
//         to form a hierarchy of captured matches, starting from the top level
//         MatchCapture object.
// capture_object: set capture_object to user assigned object.  if not specified,
//                 this child MatchCapture inherits the capture_object of the parent.
// captureName: capture the entire text matched by this MatchCapture and store as
//              property captureName in the capture_object.
// options: { parent, capture_object, captureName }
//            capture_object, capture_array, capture_meta_array }
// @copyright, 2020, stephen richter stephenrichter@gmail.com  all rights reserved.
export class MatchCapture
{
  text: string ;
  index: number ;
  isMatch: boolean;
  matchFail: boolean ;
  start: number;
  instructSeqn: number ;
  skipSeqn: number;
  orSeqn: number ;

  // bypassAll is primarily used internally. But can also be an options setting.
  // If skip=true when captureBegin, then set bypassAll so that all instructions 
  // down to captureEnd will be skipped.
  bypassAll: boolean;

  // breakOut: when true, execute no more instructions within capture group.
  // not same as bypassAll.  bypassAll also signifies that match has failed.
  breakOut: boolean;

  bypassNext: string;
  current: { } | null ;
  parent: MatchCapture | undefined;
  name: string | undefined;
  capture_meta_array: {}[] | undefined ;

  // captureName: capture the capture_object and capture_array of this MatchCapture
  //              to the capture_object of the parent MatchCapture.
  // doCapture: if true, capture to the capture_array of the parent.
  // see the captureBegin and captureEnd methods.
  captureName?: string ;
  doCapture?: boolean ;

  // capture_object and capture_array of this MatchCapture. 
  // can have both, but normally will have one or the other.
  // see matchText method for example of matched text being stored in a 
  // capture_object or capture_array.
  // Which every property is captured to, the interface of the capture item is the
  // same. {bx, lx, text, obj, arr }.
  capture_object: captureObject_interface;
  capture_array: {}[] | undefined;

  captureToArray: boolean | undefined ;

  capture: MatchCapture[] | undefined ;
  errmsg?: string;
  repeat?: repeatItem_interface[];

  constructor( text:string, index:number, options: MatchCapture_options )
  {
    this.text = text ;
    this.index = index ;
    this.isMatch = true ;   // current scan is a match.

    this.matchFail = false;  // once matchFail, ignore future match instructions.
    this.start = this.index;
    this.instructSeqn = 0;
    this.skipSeqn = -1;
    this.orSeqn = -1;
    this.bypassAll = false;
    this.breakOut = false;

    // bypass match methods. This MatchCapture is 
    this.bypassNext = 'N';

    // the current, latest match. When run .or method, use current match to 
    // know if current match has failed
    this.current = null;

    // the parent MatchCapture of this captured match.
    if (options)
    {
      this.parent = options.parent;
      this.name = options.name || '';
      this.bypassAll = options.bypassAll || false;
      this.matchFail = options.matchFail || false;

      // assign capture_object. Use to capture matches to properties in the 
      // capture object.
      if (options.capture_object)
      {
        this.capture_object = options.capture_object;
      }
      else
      {
        this.capture_object = {} ;
      }

      // the capture_object of this captureBegin object will be stored in the
      // capture_object of the parent in property captureName.
      if (options.captureName)
      {
        this.captureName = options.captureName;
      }
      if ( options.doCapture )
        this.doCapture = options.doCapture ;
    }
    else
    {
      this.capture_object = {};
    }
  }

  // run time properties.
  // parent: ref to parent MatchCapture. 
  // name: name of this match. Used when matches are captured within a larger 
  //       match.
  // capture: array of MatchCapture captured matches.
  // errmsg: error. such as invalid index. Or captureEnd when there is no
  //         parent MatchCapture to return to.

// ---------------------------- angleBracketName -----------------------------------
// a name enclosed in angle brackets.  < abc.txt >
// options: { captureName, skipSetup }
public angleBracketName(options?: MatchCapture_options)
{
  const skip = this.instructionSetup();
  if (skip == false)
  {
    // note: use doCapture just for demo use. Will capture the angle symbols to the
    //       capture_array. At captureEnd, both capture_object and capture_array
    //       will be stored in the parent capture_object and/or capture_array.
    this.captureBegin(options)
      .matchText('<', { zeroMoreWhitespace: true, doCapture:true })
      .matchRegExp('[A-Za-z0-9_\\/\\.]+', { captureName: 'name', zeroMoreWhitespace: true })
      .matchText('>', { zeroMoreWhitespace: true, doCapture:true })
      .captureEnd();
  }
  return this;
}

  // ----------------------- captureBegin --------------------------------
  // start capture of match.
  // info about match that follows is captured in capture array.
  // options: { captureName, zeroMatchOk, skipSetup,
  //            capture_object, capture_array, capture_meta_array }
  public captureBegin(options?: MatchCapture_options ) : MatchCapture
  {
    options = options || {};
    const skip = this.instructionSetup();
    const bypassAll = (skip == true) ? true : false;
    const child = new MatchCapture(this.text, this.index,
      { ...options, parent: this, bypassAll });

    // store the child MatchCapture in capture array of parent.                              
    if (!this.capture)
    {
      this.capture = [];
    }
    this.capture.push(child);

    // advance past any whitespace.
    if (!skip && options.zeroMoreWhitespace)
    {
      let ix = scan_charNeAll(child.text, child.index, ' \t\n');
      if (ix == -1)
        ix = this.text.length;
      child.index = ix;
    }

    // return the child MatchCapture as the current MatchCapture. Subsequent match methods
    // use the state of the just started capture MatchCapture.
    return child;
  }

  // ---------------------------- captureEnd -----------------------------------
  // close out current MatchCapture object. Return with ref to parent MatchCapture.
  public captureEnd( options?: MatchCapture_options )
  {
    // note: should remove this.
    const skip = this.instructionSetup();

    if (!this.parent)
    {
      this.errmsg = 'no corresponding captureBegin.';
      return this;
    }

    // the entire capture set of instructions were told to skip. So do not update the
    // match status of the parent.
    if (this.bypassAll == true)
    {
      return this.parent;
    }

    // capture contains match. Update isMatch and current index.
    if (this.matchFail == false)
    {
      this.parent.isMatch = this.isMatch;
      this.parent.index = this.index;

      options = options || {};

      // capture the match text of this match. store in object being captured.
      if ( options.captureMatchText_propertyName )
        this.capture_object[options.captureMatchText_propertyName] = this.getMatch( ) ;

      // captureName specified. Store capture_object of this child in 
      // capture_object of the parent.
      if (this.captureName || this.doCapture == true)
      {
        const lx = this.index - this.start;
        this.parent.store_capture( {bx:this.start, lx, name:this.captureName, 
                                    obj:this.capture_object}, 
                                  this.doCapture ) ;
      }
    }

    // capture did not match. Set isMatch in parent to false.
    else
    {
      options = options || {} ;
      const { zeroMatchOk = false, zeroMatchBreak = false } = options ;
      if ( zeroMatchBreak == true )
      {
        this.parent.breakOut = true ;
      }
      else if ( zeroMatchOk == false )   // no match is ok. Do not fail in parent.
        this.parent.isMatch = false;
    }

    return this.parent;
  }

  // ---------------------------- captureEndZeroOne -----------------------------------
  public captureEndZeroOne()
  {
    const zeroMatchOk = true;
    return this.captureEnd( {zeroMatchOk});
  }

  // ---------------------------- closeParen -----------------------------------
  public closeParen()
  {
    const rv = this.captureEnd();
    return rv;
  }

  // ---------------------------- endOfLine -----------------------------------
  // match to the end of line character or end of text.
  public endOfLine()
  {
    const skip = this.instructionSetup();
    if (skip == false)
    {
      const remLx = this.text.length - this.index;
      if (remLx > 0)
      {
        const fx = this.text.indexOf('\n', this.index);
        if (fx >= 0)
          this.index = fx + 1;
        else
          this.index = this.text.length;
      }
    }
    return this;
  }

  // ---------------------------- eof -----------------------------------
  // match that at EOF of the text string.
  // options: {zeroMoreWhitespace:true }
  public eof( options: MatchCapture_options )
  {
    const skip = this.instructionSetup();
    if (skip == false)
    {
      let ix = this.index;

      // advance past any whitespace.
      if (options.zeroMoreWhitespace)
      {
        ix = scan_charNeAll(this.text, ix, ' \t\n');
        if (ix == -1)
          ix = this.text.length;
      }

      const remLx = this.text.length - ix;
      if (remLx <= 0)
      {
        this.match_processMatchTrue(options, this.text.length, 0);
      }
      else
      {
        this.match_processMatchFalse(options);
      }
    }
    return this;
  }

  // ---------------------------- getMatch -----------------------------------
  // return the matched text. The match starts at this.start and continues up until
  // the current index.
  public getMatch()
  {
    if (this.matchFail == true)
      return '';
    let lx = this.index - this.start;
    if (lx > 0)
      return this.text.substr(this.start, lx);
    else
      return '';
  }

  // ---------------------------- instructionSetup -----------------------------------
  // increment instructSeqn.
  // determine if instruction should be executed or not.
  // set the matchFail flag based on isMatch and whether prior instruction is or.
  // returns skip flag. true false. skip exec of match instruction.
  // options:{ isOr:true current instruction is an .or instruction.  
  //           ( do not update matchFail ).
  //           noIncSeqn: true }
  public instructionSetup( options?: MatchCapture_options ) : boolean
  {
    let skip = false;

    // prior statement was .or
    const prior_or = (this.orSeqn == this.instructSeqn) ? true : false;

    // increment instruction seqnbr.
    if (!options || !options.noIncSeqn)
      this.instructSeqn += 1;

    // bypass all instructions in this instruction stream.
    if ((this.bypassAll == true) || ( this.breakOut == true ))
    {
      skip = true;
    }

    // matchFail. do nothing.
    else if (this.matchFail == true)
    {
      skip = true;
    }

    // skip this instruction
    else if (this.instructSeqn == this.skipSeqn)
    {
      skip = true;
    }

    // prior instruction was or.  Skip this instruction depending on isMatch.
    // ( if last instruction was match, do not run any instructions in or group )
    else if (prior_or)
    {
      if (this.isMatch == true)
        skip = true;
    }

    // isMatch is false. Since prior was not or, then match has failed.
    else if ((this.isMatch == false) && (!options || !options.isOr))
    {
      this.matchFail = true;
      skip = true;
    }

    return skip;
  }

  // ---------------------------- identifier -----------------------------------
  // options: { captureName, skipSetup }
  public identifier(options: MatchCapture_options = {})
  {
    const skip = this.instructionSetup();
    if (skip == false)
    {
      const regexp_pattern = '[A-Za-z_]' + rxp.zeroMoreWord;
      const opt = { ...options, skipSetup: true };
      this.matchRegExp(regexp_pattern, opt);
    }
    return this;
  }

  // ---------------------------- literal -----------------------------------
  // a quoted or numeric literal.
  // options: { captureName, skipSetup }
  public literal(options : MatchCapture_options = {})
  {
    const skip = this.instructionSetup();
    if (skip == false)
    {
      const regexp_pattern = rxp.beginCapture + rxp.oneMoreDigits + rxp.endCapture +
        rxp.or +
        rxp.beginCapture + rxp.singleQuoteQuoted + rxp.endCapture +
        rxp.or + rxp.doubleQuoteQuoted;
      const opt = { ...options, skipSetup: true };
      this.matchRegExp(regexp_pattern, opt);
    }
    return this;
  }

  // ---------------------- matchText ----------------------
  // match specific text at the current location.
  // options: { captureName, zeroMatchOk, skipSetup, zeroMoreWhitespace:true,
  //            peek:true, onMatch, doCapture:true }
  public matchText(matchText:string | string[], options?: MatchCapture_options)
  {
    options = options || {};
    const skip = this.instructionSetup();
    if (skip == false)
    {
      const start = this.index;
      let ix = this.index;

      // advance past any whitespace.
      if (options.zeroMoreWhitespace)
      {
        ix = scan_charNeAll(this.text, ix, ' \t\n');
        if (ix == -1)
          ix = this.text.length;
      }
      const remLx = this.text.length - ix;

      // matchText is an array. match to one of the array items.
      if (Array.isArray(matchText))
      {
        let matchFound = false;

        for (let mx = 0; mx < matchText.length; ++mx)
        {
          const item = matchText[mx];
          const lx = item.length;
          if (remLx >= lx)
          {
            if (this.text.substr(ix, lx) == item)
            {
              this.match_processMatchTrue(options, ix, lx);
              matchFound = true;
              break;
            }
          }
        }

        // no match against any items in matchText array.
        if (matchFound == false)
        {
          this.match_processMatchFalse(options);
        }
      }

      // match to matchText.
      else
      {
        const lx = matchText.length;
        if (remLx < lx)
          this.isMatch = false;
        else if (this.text.substr(ix, lx) == matchText)
        {
          this.match_processMatchTrue(options, ix, lx);
        }
        else
        {
          this.match_processMatchFalse(options);
        }
      }
    }
    return this;
  }

  // ---------------------------- match_processMatchFalse ---------------------------
  // after match false processing.
  public match_processMatchFalse(options: MatchCapture_options)
  {
    if (!options.zeroMatchOk)
      this.isMatch = false;
  }

  // ---------------------------- match_processMatchTrue -----------------------------------
  // after match true processing.
  // options:{peekNextText:'xxx', peekNotNextText:')'}
  public match_processMatchTrue( options:MatchCapture_options, bx:number, lx:number)
  {
    let isReallyTrue = true;

    // peek ahead. if false, match is not true.
    if (options.peekNextText)
    {
      const ix = bx + lx;
      const peekTrue = MatchCapture.peekNext(this.text, ix, options.peekNextText);
      if (peekTrue == false)
      {
        isReallyTrue = false;
      }
    }

    // peek ahead. if true, match is not true.
    if (options.peekNextNotText)
    {
      const ix = bx + lx;
      const peekTrue = MatchCapture.peekNext(this.text, ix, options.peekNextNotText);
      if (peekTrue == true)
      {
        isReallyTrue = false;
      }
    }

    // match is actually not true.
    if (isReallyTrue == false)
    {
      this.match_processMatchFalse(options);
    }

    else
    {
      // set flag that match is true.
      this.isMatch = true;

      // advance index in this match state object.
      if (!options.peek)
        this.index = bx + lx;

      // the matched text.
      const match_text = this.text.substr(bx, lx).trim( ) ;
      if ( options.captureName || options.doCapture == true )
        this.store_capture({bx, lx, name:options.captureName, text:match_text}, options.doCapture ) ;

      // run match code.
      // match code is arrow function.  options:{onMatch:( )=>{cap.assign = true;}}
      if (options.onMatch)
      {
        options.onMatch({ capture_object: this.capture_object, match_text });
      }
    }
  }

  // ---------------------- matchRegExp ----------------------
  // match the regular expression against the text located at current index.
  // The match runs for the length of what the regexp matches. But the regexp match
  // must start at .index. Use scanRegExp to scan ahead for the regexp match.
  // options: { skipSetup, captureName, captureToArray, peek:true, 
  //            peekNextText:'xxx' }
  public matchRegExp(regexp:string | RegExp, options? : MatchCapture_options )
  {
    let skip = false;
    options = options || {};
    if (!options.skipSetup)
    {
      skip = this.instructionSetup();
    }

    if (skip == false)
    {
      let ix = this.index;

      // advance past any whitespace.
      if (options.zeroMoreWhitespace)
      {
        ix = scan_charNeAll(this.text, ix, ' \t\n');
        if (ix == -1)
          ix = this.text.length;
      }

      const remLx = this.text.length - ix;
      if (remLx <= 0)
        this.isMatch = false;
      else
      {
        const { matchBx, matchOx, matchLx } = regex_exec(this.text, ix, regexp);
        if (matchOx == 0)
        {
          this.match_processMatchTrue(options, matchBx, matchLx);
        }
        else
        {
          this.match_processMatchFalse(options);
        }
      }
    }
    return this;
  }

  // ---------------------- nameStartOneMore ----------------------
  // match one or more start of name characters.
  public nameStartOneMore()
  {
    const skip = this.instructionSetup();
    if (skip == false)
    {
      let ix = this.index;

      const re = new RegExp(/[a-zA-Z_]+/g);
      const rv = regex_exec(this.text, ix, re);
      if ((rv.matchBx == 0) && (rv.matchLx > 0))
      {
        this.index += rv.matchLx;
        this.isMatch = true;
      }
      else
      {
        this.isMatch = false;
      }
    }
    return this;
  }

  // ---------------------------- oneMoreDigits -----------------------------------
  // options: { captureName, skipSetup }
  public oneMoreDigits(options = {})
  {
    const skip = this.instructionSetup();
    if (skip == false)
    {
      const regexp_pattern = '\\d+';
      const opt = { ...options, skipSetup: true };
      this.matchRegExp(regexp_pattern, opt);
    }
    return this;
  }

  // ---------------------- oneMoreWhitespace ----------------------
  public oneMoreWhitespace( )
  {
    const skip = this.instructionSetup();
    if (skip == false)
    {
      let gotWhitespace = false;
      let ix = this.index;
      while (ix < this.text.length)
      {
        const ch1 = this.text.substr(ix, 1);
        if ((ch1 == ' ') || (ch1 == '\t') || (ch1 == '\n'))
        {
          ix += 1;
          gotWhitespace = true;
        }
        else
          break;
      }

      // match result.
      if (gotWhitespace)
      {
        this.index = ix;
        this.isMatch = true;
      }
      else
        this.isMatch = false;
    }
    return this;
  }

  // ---------------------------- openParen -----------------------------------
  public openParen(options?: MatchCapture_options)
  {
    const child = this.captureBegin();
    return child;
  }

  // ---------------------------- or -----------------------------------
  public or(options?: MatchCapture_options)
  {
    const isOr = true;
    const skip = this.instructionSetup({ isOr: true });
    this.orSeqn = this.instructSeqn;

    // last instruction was true. The instruction that follows should be skipped.
    if (this.isMatch == true)
      this.skipSeqn = this.instructSeqn + 1;

    // store reference to this method and its parameters. Will be used by
    // repeatMatch method.
    if (options && options.repeatable && !options.isRepeatRun)
    {
      if (!this.repeat)
        this.repeat = [];
      this.repeat.push(
        { method: this.or, parm1: options });
    }

    return this;
  }

  // --------------------------------- MatchCapture.peekNext ---------------------------
  // static method. check that peekNext text or array of text is a match.
  static peekNext(text:string, ix:number, match:string|string[])
  {
    let peekTrue = false;
    const matchItem = match;

    // advance past whitespace.
    ix = scan_charNeAll(text, ix, ' \t\n');
    if (ix == -1)
      ix = text.length;

    const remLx = text.length - ix;

    if (Array.isArray(match))
    {
      for (let mx = 0; mx < match.length; ++mx)
      {
        const matchItem = match[mx];
        const peekLx = matchItem.length;
        if ((peekLx <= remLx) && (text.substr(ix, peekLx) == matchItem))
        {
          peekTrue = true;
          break;
        }
      }
    }
    else
    {
      const peekLx = match.length;
      if ((peekLx <= remLx) && (text.substr(ix, peekLx) == match))
        peekTrue = true;
    }
    return peekTrue;
  }

  // ---------------------------- repeatMatch -----------------------------------
  // match the specified text.  If match is true, run the method stored in repeat
  // property of this state object.
  // Repeat this match and run repeat method process until match is not true.
  public repeatMatch( options?: MatchCapture_options )
  {
    const skip = this.instructionSetup();
    if (!skip)
    {
      while (1)
      {
        if ( this.breakOut == true )
          break ;

        else if (this.isMatch == true)
        {
          this.repeat_runMethod();
        }

        // not a match. Reset to match true and break out of loop. Will return to
        // caller and continue with next match method.
        else
        {
          this.isMatch = true;
          break;
        }
      }
    }
    return this;
  }

  // ---------------------------- repeatMatchText -----------------------------------
  // match the specified text.  If match is true, run the method stored in repeat
  // property of this state object.
  // Repeat this match and run repeat method process until match is not true.
  public repeatMatchText(matchText:string, options: MatchCapture_options)
  {
    const skip = this.instructionSetup();
    if (!skip)
    {
      while (1)
      {
        // run actual matchText method. If match is true, match index is advanced and
        // then run the repeat method.
        this.matchText(matchText, options);
        if (this.isMatch == true)
        {
          this.repeat_runMethod();
        }

        // not a match. Reset to match true and break out of loop. Will return to
        // caller and continue with next match method.
        else
        {
          this.isMatch = true;
          break;
        }
      }
    }
    return this;
  }

  // ---------------------------- repeat_runMethod -----------------------------------
  // run the methods stored in the repeat array property of this state object.
  public repeat_runMethod()
  {
    if ( this.repeat )
    {
      for (let ix = 0; ix < this.repeat.length; ++ix)
      {
        const item = this.repeat[ix];

        const method = item.method;

        // method stores a reference to the method to be run.
        // use call method of this method reference to set the "this" of the called 
        // method.
        if (item.parm2)
          method.call(this, item.parm1, { ...item.parm2, isRepeatRun: true });
        else
          method.call(this, { ...item.parm1, isRepeatRun: true });
      }
    }
  }

  // ---------------------------- restore_capture -----------------------------------
  public restore_capture(saved_capture: captureObject_interface )
  {
    this.capture_object = saved_capture;
  }

public ruxRoutine( userRoutine: ( matchCapture:MatchCapture, ix:number) => void )
{
  const jx = 5 ;
  userRoutine( this, jx );

}

  // ---------------------------- runRoutine -----------------------------------
  // options: { captureName, zeroMatchOk, skipSetup, capture_object, repeatable,
  //            zeroMatchBreak }
  // userRoutine: function with signature 
  //              (tm: MatchCapture, options: MatchCapture_options)
  //              example use:
  // .runRoutine(parse_c_code.parse_exprOper,
  //   {
  //     doCapture: true, repeatable: true, zeroMatchBreak:true
  //   })
  public runRoutine( userRoutine: (matchCapture:MatchCapture, 
                                   options:MatchCapture_options) => void,
                     options: MatchCapture_options)
  {
    const skip = this.instructionSetup({ noIncSeqn: true });
    if (skip)
    {
      this.instructSeqn += 1;
    }
    else
    {
      userRoutine(this, options);
    }

    // store reference to this method and its parameters. Will be used by
    // repeatMatch method.
    if (options && options.repeatable && !options.isRepeatRun)
    {
      if (!this.repeat)
        this.repeat = [];
      this.repeat.push(
        { method: this.runRoutine, parm1: userRoutine, parm2: options });
    }

    return this;
  }

  // ---------------------------- was_ruyRoutine -----------------------------------
  // options: { captureName, zeroMatchOk, skipSetup, capture_object, repeatable }
  public was_ruyRoutine(userRoutine: any, options: MatchCapture_options)
  {
    const skip = this.instructionSetup({ noIncSeqn: true });
    if (skip)
    {
      this.instructSeqn += 1;
    }
    else
    {
      userRoutine(this, options);
    }

    // store reference to this method and its parameters. Will be used by
    // repeatMatch method.
    if (options && options.repeatable && !options.isRepeatRun)
    {
      if (!this.repeat)
        this.repeat = [];
      this.repeat.push(
        { method: this.runRoutine, parm1: userRoutine, parm2: options });
    }

    return this;
  }

  // ---------------------------- setup_capture -----------------------------------
  // setup MatchCapture with capture object. Match values are then stored in the 
  // capture object when a match name is specified on the match method.
  public setup_capture(capture_object:{})
  {
    const current_capture = this.capture_object || null;
    this.capture_object = capture_object;
    return current_capture;
  }

  // ---------------------------- store_capture -----------------------------------
  // store the match text in capture_object
  // vlu - either match text or an object composed by a match method.
  // item - item stores the value to capture, capture name, and loc of the value.
  public store_capture( item: captureItem_interface, toArray?:boolean,
                        errmsg?:string)
  {
    let vlu : string | captureObject_interface ;

    if (item.text)
      vlu = item.text ;
    else
      vlu = item.obj  || '' ;

    // make sure meta property exists.
    if ( !this.capture_object.meta)
      this.capture_object.meta = {} ;

    // capture as indexer in the capture_object (makes the capture_object an array)
    if ( toArray == true )
    {
      const numKeys = Object.keys(this.capture_object).length;
      const indexer = numKeys;
      this.capture_object[indexer] = vlu;
      this.capture_object.meta[indexer] = item;
    }

    else
    {
      const {name:captureName} = item ;
      if ( captureName )
      {
        this.capture_object[captureName] = vlu;
        this.capture_object.meta[captureName] = item;
      }
    }
  }

  // ---------------------------- store_capture_object -----------------------------
  // store the match text in capture_object
  // vlu - either match text or an object composed by a match method.
  public store_capture_object( captureName:string, item: captureItem_interface)
  {
    if (!this.capture_object)
      this.capture_object = {};

    this.capture_object[captureName] = item ;
  }

  // ---------------------------- store_capture_array -----------------------------
  // store the match text in capture_object
  // vlu - either match text or an object composed by a match method.
  public store_capture_array( item: captureItem_interface )
  {
    if ( !this.capture_array )
      this.capture_array = [] ;

    this.capture_array.push(item) ;
  }

  // ---------------------------- old_storx_capture -----------------------------------
  // store the match text in capture_object
  // vlu - either match text or an object composed by a match method.
  public old_storx_capture(
    captureName: string, captureToArray: boolean, cap: {}, bx: number, lx: number,
    errmsg?: string, cap_meta_array?: {})
  {
    // capture to array.
    if (captureToArray == true)
    {
      // this parent MatchCapture does not contain capture_array. Look up parent
      // hierarchy until capture_array is found.
      let tm: MatchCapture = this;
      while (!tm.capture_array)
      {
        if (!tm.parent)
        {
          tm.capture_array = [];
          tm.capture_meta_array = [];
          break;
        }
        tm = tm.parent;
      }

      tm.capture_array.push(cap);
      if (cap_meta_array)
        tm.capture_meta_array!.push(cap_meta_array);
      else if (this.capture_meta_array)
        tm.capture_meta_array!.push({ bx, lx, errmsg });
    }

    // store capture value as property name in capture_object.
    else
    {
      // create capture_object
      if (captureName && !this.capture_object)
        this.capture_object = {};

      // capture match text.
      if ((typeof cap) == 'string')
      {
        this.capture_object[captureName] = { bx, lx, text: cap as string };
      }
      else
      {
        this.capture_object[captureName] = cap;
      }

      // capture_object contains "meta" property. Store meta info about the capture
      // in property of that meta object.
      // if (this.capture_object.meta)
      // {
      //   if (cap_meta_array)
      //     this.capture_object.meta[captureName] = cap_meta_array;
      //   else
      //     this.capture_object.meta[captureName] = { bx, lx, errmsg };
      // }
    }
  }

  // ---------------------------- until -----------------------------------
  // match until specified text is found.
  // include: N Y. Include the until text in the match text.
  public until(untilText:string, include:string = 'Y')
  {
    const skip = this.instructionSetup();
    if (skip == false)
    {
      const remLx = this.text.length - this.index;
      if (remLx >= untilText.length)
      {
        const fx = this.text.indexOf(untilText, this.index);
        if (fx == -1)
        {
          this.isMatch = false;
        }
        else
        {
          this.isMatch = true;
          this.index = fx;
          if (include == 'Y')
            this.index += untilText.length;
        }
      }
    }
    return this;
  }

  // ---------------------- zeroMoreWhitespace ----------------------
  public zeroMoreWhitespace(options?: MatchCapture_options)
  {
    const skip = this.instructionSetup();
    if (skip == false)
    {
      let ix = this.index;
      while (ix < this.text.length)
      {
        const ch1 = this.text.substr(ix, 1);
        if ((ch1 == ' ') || (ch1 == '\t') || (ch1 == '\n'))
        {
          ix += 1;
        }
        else
          break;
      }
      this.index = ix;
    }

    // store reference to this method and its parameters. Will be used by
    // repeatMatch method.
    if (options && options.repeatable && !options.isRepeatRun)
    {
      if (!this.repeat)
        this.repeat = [];
      this.repeat.push(
        { method: this.zeroMoreWhitespace, parm1: options });
    }

    return this;
  }
};
