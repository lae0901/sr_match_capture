// ./src/text-match.ts

import { scan_charNeAll, rxp, regex_exec } from 'sr_core_ts';
type MatchOper = 'identifier' | 'text' | 'or' | 'captureBegin' | 'captureEnd' |
              'repeatBegin' | 'repeatEnd' | 'repeatMatchText';

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

  while( mx < matchArr.length )
  {
    const item = matchArr[mx] ;
    mx += 1 ;

    if ( item.oper == 'identifier')
    {
      match_identifier( state, item ) ;
    }
    else if ( item.oper == 'text')
    {
      match_text( state, item )
    }
    else if ( item.oper == 'repeatBegin')
    {
      match_repeatBegin( state, item, mx ) ;
    }
    else if ( item.oper == 'repeatMatchText')
    {
      match_repeatMatchText(state, item);
    }
    else if ( item.oper == 'repeatEnd')
    {

    }
  }
  return state ;
}

// ---------------------------- match_identifier ----------------------------------
// options: { captureName, skipSetup }
function match_identifier( matchState: iMatchState, item: iMatchItem )
{
  if ( matchState.isMatch )
  {
    // first char is letter, the zero or more word characters.
    const regexp_pattern = '[A-Za-z_]' + rxp.zeroMoreWord;

    match_regExp( matchState, item, regexp_pattern);
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
  let skip = false ;
  if ( state.matchFail )
  {
    skip = true ;
  }

  if (skip == false)
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
  let skip = false;
  if (state.matchFail)
  {
    skip = true;
  }

  if (skip == false)
  {
    let ix = state.index;

    // index into matchArr of this repeatBegin item.
    state.repeatBegin_arrIndex = arrIndex ;

    // start capture property as an array
    if ( item.captureName )
    {
      state.capture[item.captureName] = [] ;
    }
  }
}

// ------------------------------- match_repeatMatchText -----------------------------
// match specific text at the current location.
// options: { captureName, zeroMatchOk, skipSetup, zeroMoreWhitespace:true,
//            peek:true, onMatch, doCapture:true }
function match_repeatMatchText(state: iMatchState, item: iMatchItem)
{
  let skip = false;
  if (state.matchFail)
  {
    skip = true;
  }

  if (skip == false)
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

      // matchText is an array. match to one of the array items.
      if (Array.isArray(item.text))
      {
        let matchFound = false;

        for (let mx = 0; mx < item.text.length; ++mx)
        {
          const textItem = item.text[mx];
          const lx = textItem.length;
          if (remLx >= lx)
          {
            if (state.text.substr(ix, lx) == textItem)
            {
              matchFound = true;
              break;
            }
          }
        }

        // no match against any items in matchText array.
        if (matchFound == false)
        {
          processMatchFalse(state, item);
        }
      }

      // match to matchText.
      else if (item.text)
      {
        const lx = item.text.length;
        if (remLx < lx)
          state.isMatch = false;
        else if (state.text.substr(ix, lx) == item.text)
        {
          processMatchTrue(state, item, ix, lx);
        }
        else
        {
          processMatchFalse(state, item);
        }
      }
    }
  }
}

// ------------------------------- match_text -----------------------------
// match specific text at the current location.
// options: { captureName, zeroMatchOk, skipSetup, zeroMoreWhitespace:true,
//            peek:true, onMatch, doCapture:true }
function match_text( state:iMatchState, item:iMatchItem )
{
  let skip = false;
  if (state.matchFail)
  {
    skip = true;
  }

  if (skip == false)
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
    if (remLx <= 0 )
      state.isMatch = false;
    else
    {

      // matchText is an array. match to one of the array items.
      if (Array.isArray( item.text ))
      {
        let matchFound = false;

        for (let mx = 0; mx < item.text.length; ++mx)
        {
          const textItem = item.text[mx];
          const lx = textItem.length;
          if (remLx >= lx)
          {
            if ( state.text.substr(ix, lx) == textItem)
            {
              processMatchTrue( state, item, ix, lx);
              matchFound = true;
              break;
            }
          }
        }

        // no match against any items in matchText array.
        if (matchFound == false)
        {
          processMatchFalse( state, item);
        }
      }

      // match to matchText.
      else if ( item.text )
      {
        const lx = item.text.length;
        if (remLx < lx)
          state.isMatch = false;
        else if ( state.text.substr(ix, lx) == item.text )
        {
          processMatchTrue( state, item, ix, lx);
        }
        else
        {
          processMatchFalse( state, item );
        }
      }
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
    if ( item.captureName)
    {
      const match_text = state.text.substr(bx, lx).trim();
      state.capture[item.captureName] = match_text;
    }
  }
}
