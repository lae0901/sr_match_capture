import {testResults_append, testResults_consoleLog, testResults_new } from 'sr_test_framework';
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

  testResults_consoleLog( results ) ;
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
    const testResult = { keyword:cap.keyword,vlu:cap.vlu} ;
    testResults_append(results, { desc, method, expected, testResult });
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
    const testResult = { keyword: cap.keyword, vlu: cap.vlu };
    testResults_append(results, { desc, method, expected, testResult });
  }
  

  return results ;
}


