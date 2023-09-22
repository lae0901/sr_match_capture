import {testResults_append, testResults_consoleLog, testResults_new } from 'sr_test_framework';
import { MatchCapture, captureItem_interface, MatchCapture_options, captureObject_interface,
          iMatchCapture, iMatchItem, matchArr_match }
  from './match-capture.js';

// run main function that is declared as async. 
async_main( ) ;

// ------------------------------- async_main ---------------------------------
async function async_main( )
{
  const results = testResults_new( ) ;

  // match_test
  {
    const res = match_test() ;
    results.push( ...res ) ;
  }

  // match using matchArr method.
  {
    const res = arrayMatch_test( );
    results.push(...res);
  }

  testResults_consoleLog( results ) ;
}

// -------------------------------- arrayMatch_test --------------------------------
function arrayMatch_test()
{
  const results = testResults_new();
  
  // matchArr with simple keyword enclosed value.
  {
    const arr: iMatchItem[] = [
      {oper:'identifier', captureName:'keyword', zeroMoreWhitespace:true},
      {oper:'text', text:'(', zeroMoreWhitespace:false},
      {oper:'identifier', captureName: 'vlu', zeroMoreWhitespace: true },
      { oper: 'text', text: ')', zeroMoreWhitespace: true },
    ]
    const text = 'overlay(sditno)';
    const cap: iMatchCapture = {} ;
    const match = matchArr_match(text, 0, arr, cap ) ;
    
    // match keyword with paren enclosed identifier
    const method = 'matchArr_match';
    const aspect = 'simple paren keyword';
    const desc = 'match keyword with simple paren enclosed value';
    const expected = { keyword: 'overlay', vlu: 'sditno' };
    const actual = { keyword: cap.keyword, vlu: cap.vlu };
    testResults_append(results, { desc, method, expected, actual });
  }

  // matchArr. repeating keyword enclosed values.
  {
    const arr: iMatchItem[] = [
      { oper: 'identifier', captureName: 'keyword', zeroMoreWhitespace: true },
      { oper: 'text', text: '(', zeroMoreWhitespace: false },
      { oper: 'repeatBegin', captureName:'args'},
      { oper: 'identifier', doCapture:true, meta:true, zeroMoreWhitespace: true },
      { oper: 'or' },
      { oper: 'literal', doCapture:true, meta:true, zeroMoreWhitespace: true },
      { oper: 'repeatMatchText', text:':', zeroMoreWhitespace:true},
      { oper: 'repeatEnd' },
      { oper: 'text', text: ')', zeroMoreWhitespace: true },
    ]
    const text = 'overlay(sditno:\'jim\':25)';
    const match = matchArr_match(text, 0, arr );
    const { keyword, args } = match.capture ;

    for( const arg of args as string[] )
    {
      console.log(`arg ${arg}`);
    }

    // match keyword with paren enclosed identifier
    const method = 'matchArr_match';
    const aspect = 'multiple paren keyword';
    const desc = 'match keyword with multiple paren enclosed values';
    const expected = { keyword: 'overlay', args: ['sditno','jim','25'] };
    const actual = match.capture;
    testResults_append(results, { desc, method, expected, actual });
  }

  return results;
}

// ---------------------------------- match_test ----------------------------------
function match_test( )
{
  const results = testResults_new( ) ;

  // match keyword with paren enclosed identifier
  {
    const text = 'overlay(oditno)' ;
    const tm = new MatchCapture(text, 0, {});
    tm.identifier({ zeroMoreWhitespace: true, captureName: 'keyword' })
    .matchText('(', {zeroMoreWhitespace:false})
    .identifier({zeroMoreWhitespace:true, captureName:'vlu'})
    .matchText(')', {zeroMoreWhitespace:true});

    const cap = tm.capture_object;

    const method = 'MatchCapture';
    const aspect = 'simple paren keyword';
    const desc = 'match keyword with simple paren enclosed value';
    const expected = {keyword:'overlay', vlu:'oditno'};
    const actual = { keyword:cap.keyword,vlu:cap.vlu} ;
    testResults_append(results, { desc, method, expected, actual });
  }

  // paren enclosed with repeating identifiers.
  {
    const text = 'overlay(oditno:steve)';
    let tm = new MatchCapture(text, 0, {});
    tm.identifier({ zeroMoreWhitespace: true, captureName: 'keyword' });
    tm.matchText('(', { zeroMoreWhitespace: false });

    const tm2 = tm.captureBegin({ captureName: 'args', repeatable: true });
    tm2.identifier({ zeroMoreWhitespace: true })
    tm2.repeatMatchText(':', { zeroMoreWhitespace: true })
    tm = tm2.captureEnd();

    tm.matchText(')', { zeroMoreWhitespace: true });

    const cap = tm.capture_object;

    const method = 'MatchCapture';
    const aspect = 'multiple identifiers';
    const desc = 'match keyword with multiple paren enclosed identifiers';
    const expected = { keyword: 'overlay', vlu: 'oditno' };
    const actual = { keyword: cap.keyword, vlu: cap.vlu };
    testResults_append(results, { desc, method, expected, actual });
  }

  // paren enclosed with multiple values.
  {
    const text = 'overlay(oditno:25)';
    const tm = new MatchCapture(text, 0, {});
    tm.identifier({ zeroMoreWhitespace: true, captureName: 'keyword' })
      .matchText('(', { zeroMoreWhitespace: false })

      .captureBegin({ captureName: 'args', repeatable:true })
      .identifier({ zeroMoreWhitespace: true })
      .repeatMatchText(':', { zeroMoreWhitespace: true })
      .captureEnd()

      .matchText(')', { zeroMoreWhitespace: true });

    const cap = tm.capture_object;

    const method = 'MatchCapture';
    const aspect = 'simple paren keyword';
    const desc = 'match keyword with simple paren enclosed value';
    const expected = { keyword: 'overlay', vlu: 'oditno' };
    const actual = { keyword: cap.keyword, vlu: cap.vlu };
    testResults_append(results, { desc, method, expected, actual });
  }

  return results ;
}


