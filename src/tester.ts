import {testResults_append, testResults_consoleLog, testResults_new } from 'sr_test_framework';
import { iMatchCapture, iMatchItem, matchArr_match } from './array-match';
import { MatchCapture, captureItem_interface, MatchCapture_options, captureObject_interface }
  from './match-capture';

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
      { oper: 'identifier', captureName: 'vlu', zeroMoreWhitespace: true },
      { oper: 'repeatMatchText', zeroMoreWhitespace:true},
      { oper: 'repeatEnd' },
      { oper: 'text', text: ')', zeroMoreWhitespace: true },
    ]
    const text = 'overlay(sditno)';
    const cap: iMatchCapture = {};
    const match = matchArr_match(text, 0, arr, cap);

    // match keyword with paren enclosed identifier
    const method = 'matchArr_match';
    const aspect = 'simple paren keyword';
    const desc = 'match keyword with simple paren enclosed value';
    const expected = { keyword: 'overlay', vlu: 'sditno' };
    const actual = { keyword: cap.keyword, vlu: cap.vlu };
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


