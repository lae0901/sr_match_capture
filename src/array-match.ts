// ./src/text-match.ts

import { scan_charNeAll, rxp, regex_exec } from 'sr_core_ts';
type MatchOper = 'identifier' | 'literal' | 'text' | 'or' | 
                'captureBegin' | 'captureEnd' |
                'repeatBegin' | 'repeatEnd' | 'repeatMatchText';

type InstructionType = 'match' | 'or' | 'control' ;                

// --------------------------------- iMatchCapture ---------------------------------
export interface iMatchCapture
{
  [key: string]: { bx: number, lx: number, text: string } | string | any[];
}

// ---------------------------------- iMatchItem ----------------------------------
export interface iMatchItem
{
  oper: MatchOper;
  text?: string | string[];
  
  captureName?: string;
  doCapture?: boolean;

  zeroMoreWhitespace?: boolean;
  peekNextText?: string;
  peekNextNotText?: string;
  peek?:boolean;
  zeroMatchOk?:boolean;
}

// ---------------------------------- iMatchState ----------------------------------
export interface iMatchState
{
  matchArr_index?:number;

  // text of string being scanned and matched.
  text:string;

  // index into string being matched.
  index: number;

  // match found index.
  found: number;

  isMatch: boolean;
  matchFail: boolean;

  // captured matches
  // capture: {[key:string]:string}
  capture: iMatchCapture;

  repeatBegin_arrIndex?: number;
  repeat_captureName?:string;

  // group of or match instructions being evaluated. 
  or_active?: boolean;
}

// --------------------------------- matchArr_match ---------------------------------
// process the array of match instructions against a text string.
// return object which contains index of match and match capture object.
export function matchArr_match( text: string, bx:number, 
                      matchArr:iMatchItem[], capture?: iMatchCapture )
{
  let mx = 0;
  const state: iMatchState = {text, index:bx, found:-1, isMatch:true, matchFail:false, capture:{} };
  if ( capture )
    state.capture = capture ;
  state.matchArr_index = -1 ;

  while( true )
  {
    state.matchArr_index += 1 ;
    if ( state.matchArr_index >= matchArr.length )
      break ;
    const item = matchArr[ state.matchArr_index ] ;

    if ( item.oper == 'identifier')
    {
      match_identifier( state, item ) ;
    }
    else if (item.oper == 'literal')
    {
      match_literal(state, item);
    }
    else if ( item.oper == 'text')
    {
      match_text( state, item )
    }
    else if ( item.oper == 'repeatBegin')
    {
      match_repeatBegin( state, item, state.matchArr_index ) ;
    }
    else if ( item.oper == 'repeatMatchText')
    {
      match_repeatMatchText(state, item);
    }
    else if ( item.oper == 'repeatEnd')
    {
      match_repeatEnd(state, item );
    }
    else if (item.oper == 'or')
    {
      match_or(state, item);
    }
  }
  return state ;
}

// ------------------------------- instructionSetup -------------------------------
function instructionSetup( state: iMatchState, item: iMatchItem, 
                instructionType: InstructionType = 'match' )
{
  let skip = false ;

  // clear or_active flag if not a match instruction.
  if ( instructionType != 'match')
    state.or_active = false ;

  if ( state.matchFail )
    skip = true ;

  else if ( state.or_active )
  {
    if ( state.isMatch == true )
      skip = true ;
    state.or_active = false ;  // next instruction, or_active will be off.
  }

  else if ( instructionType == 'or')
  {
    skip = false ;
  }

  else if ( !state.isMatch )
  {
    state.matchFail = true ;
    skip = true ;
  }

  return skip ;
}

// ---------------------------- match_identifier ----------------------------------
// options: { captureName, skipSetup }
function match_identifier( state: iMatchState, item: iMatchItem )
{
  if ( !state.matchFail )
  {
    // first char is letter, the zero or more word characters.
    const regexp_pattern = '[A-Za-z_]' + rxp.zeroMoreWord;

    match_regExp( state, item, regexp_pattern);
  }
}

// ---------------------------- match_literal ----------------------------------
  // a quoted or numeric literal.
function match_literal(state: iMatchState, item: iMatchItem)
{
  if (!state.matchFail)
  {
    const regexp_pattern = rxp.beginCapture + rxp.oneMoreDigits + rxp.endCapture +
      rxp.or +
      rxp.beginCapture + rxp.singleQuoteQuoted + rxp.endCapture +
      rxp.or + rxp.doubleQuoteQuoted;
    match_regExp(state, item, regexp_pattern);
  }
}

// ---------------------------- match_or ----------------------------------
// or match. If last match was false, reset to true to enable the next
// match to run and set isMatch to true or false.  
function match_or(state: iMatchState, item: iMatchItem)
{
  let skip = instructionSetup(state, item, 'or');
  if (!skip)
  {
    state.or_active = true ;
  }
}

// -------------------------------- match_regExp -------------------------
// match the regular expression against the text located at current index.
// The match runs for the length of what the regexp matches. But the regexp match
// must start at .index. Use scanRegExp to scan ahead for the regexp match.
// options: { skipSetup, captureName, captureToArray, peek:true, 
//            peekNextText:'xxx' }
function match_regExp(  state: iMatchState, item: iMatchItem, 
                        regexp: string | RegExp )
{
  let skip = instructionSetup( state, item, 'match' ) ;
  if (!skip)
  {
    let ix = state.index;

    // advance past any whitespace.
    if (item.zeroMoreWhitespace)
    {
      ix = scan_charNeAll(state.text, ix, ' \t\n');
      if (ix == -1)
        ix = state.text.length;
    }

    const remLx = state.text.length - ix;
    if (remLx <= 0)
      state.isMatch = false;
    else
    {
      const { matchBx, matchOx, matchLx } = regex_exec(state.text, ix, regexp);
      if (matchOx == 0)
      {
        processMatchTrue( state, item, matchBx, matchLx);
      }
      else
      {
        processMatchFalse( state, item );
      }
    }
  }
}

// ------------------------------- match_repeatBegin -------------------------------
// arrIndex: index into matchArr array of this match item.
function match_repeatBegin(state: iMatchState, item: iMatchItem, arrIndex:number )
{
  let skip = instructionSetup(state, item, 'control');

  if (skip == false)
  {
    let ix = state.index;

    // index into matchArr of this repeatBegin item.
    state.repeatBegin_arrIndex = arrIndex ;
    state.repeat_captureName = '' ;

    // start capture property as an array
    if ( item.captureName )
    {
      state.capture[item.captureName] = [] ;
      state.repeat_captureName = item.captureName;
    }
  }
}

// ------------------------------- match_repeatEnd -------------------------------
// end of repeat block. clear out repeat fields in the state object.
function match_repeatEnd(state: iMatchState, item: iMatchItem)
{
  let skip = instructionSetup(state, item, 'control');

  if (skip == false)
  {
    state.repeatBegin_arrIndex = -1;
    state.repeat_captureName = '';
  }
}

// ------------------------------- match_repeatMatchText -----------------------------
// match specific text at the current location.
// options: { captureName, zeroMatchOk, skipSetup, zeroMoreWhitespace:true,
//            peek:true, onMatch, doCapture:true }
function match_repeatMatchText(state: iMatchState, item: iMatchItem)
{
  let skip = instructionSetup(state, item, 'match');
  if (skip == false)
  {
    const { matchText, matchIx } = tm_actual(state, item);
    if (matchIx >= 0)
    {
      processMatchTrue(state, item, matchIx, matchText.length);

      // repeatMatch. set instruction array index back to start of repeat.
      state.matchArr_index = state.repeatBegin_arrIndex!;
    }
    else
    {
      // match false does not mark entire match as fail. Simply continue
      // on without repeat.
    }
  }
}

// ------------------------------- match_text -----------------------------
// match specific text at the current location.
// options: { captureName, zeroMatchOk, skipSetup, zeroMoreWhitespace:true,
//            peek:true, onMatch, doCapture:true }
function match_text( state:iMatchState, item:iMatchItem )
{
  let skip = instructionSetup(state, item, 'match');
  if (skip == false)
  {
    const { matchText, matchIx } = tm_actual(state, item ) ;
    if (matchIx >= 0)
    {
      processMatchTrue(state, item, matchIx, matchText.length);
    }
    else
    {
      processMatchFalse(state, item);
    }
  }
}

// --------------------------------- peekNext ---------------------------
// static method. check that peekNext text or array of text is a match.
function peekNext(text: string, ix: number, match: string | string[]): boolean
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

// ---------------------------- processMatchFalse ---------------------------
// after match false processing.
function processMatchFalse( state:iMatchState, item: iMatchItem )
{
  if (!item.zeroMatchOk)
    state.isMatch = false;
}

// ---------------------------- processMatchTrue -----------------------------------
// after match true processing.
// options:{peekNextText:'xxx', peekNotNextText:')'}
function processMatchTrue( state:iMatchState, item: iMatchItem, bx: number, lx: number)
{
  let isReallyTrue = true;

  // peek ahead. if false, match is not true.
  if (item.peekNextText)
  {
    const ix = bx + lx;
    const peekTrue = peekNext( state.text, ix, item.peekNextText);
    if (peekTrue == false)
    {
      isReallyTrue = false;
    }
  }

  // peek ahead. if true, match is not true.
  if ( item.peekNextNotText)
  {
    const ix = bx + lx;
    const peekTrue = peekNext( state.text, ix, item.peekNextNotText);
    if (peekTrue == true)
    {
      isReallyTrue = false;
    }
  }

  // match is actually not true.
  if (isReallyTrue == false)
  {
    processMatchFalse( state, item);
  }

  else
  {
    // set flag that match is true.
    state.isMatch = true;

    // advance index in this match state object.
    if (!item.peek)
      state.index = bx + lx;

    // capture the matched text.
    const match_text = state.text.substr(bx, lx).trim();

    // capture to property in capture object.
    if ( item.captureName)
    {
      state.capture[item.captureName] = match_text;
    }

    // repeat capture. Capture to array in capture object.
    if ( item.doCapture && state.repeat_captureName )
    {
      const vlu = state.capture[state.repeat_captureName];
      if ( Array.isArray(vlu))
      {
        vlu.push(match_text) ;
      }
    }
  }
}

// ------------------------------- tm_actual -------------------------------
function tm_actual(state: iMatchState, item: iMatchItem )
{
  let matchText = '' ;
  let matchIx = -1 ;

  let ix = state.index;

  // advance past any whitespace.
  if (item.zeroMoreWhitespace)
  {
    ix = scan_charNeAll(state.text, ix, ' \t\n');
    if (ix == -1)
      ix = state.text.length;
  }

  const remLx = state.text.length - ix;

  // matchText is an array. match to one of the array items.
  if (Array.isArray(item.text))
  {
    for (let mx = 0; mx < item.text.length; ++mx)
    {
      const textItem = item.text[mx];
      const lx = textItem.length;
      if (remLx >= lx)
      {
        if (state.text.substr(ix, lx) == textItem)
        {
          matchText = textItem ;
          matchIx = ix ;
          break ;
        }
      }
    }
  }

  // match to matchText.
  else if (item.text)
  {
    const lx = item.text.length;
    if ((remLx >= lx) && (state.text.substr(ix, lx) == item.text))
    {
      matchText = item.text ;
      matchIx = ix ;
    }
  }

  return { matchText, matchIx } ;
}
