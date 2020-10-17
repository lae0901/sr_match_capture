# match-capture - apply match instructions, capture match results

### matchArr_match function used to match and capture according to array of match instructions.
```
  import { iMatchCapture, iMatchItem, matchArr_match } from 'sr_match_capture';

  // matchArr. repeating keyword enclosed values.
  const arr: iMatchItem[] = [
    { oper: 'identifier', captureName: 'keyword', zeroMoreWhitespace: true },
    { oper: 'text', text: '(', zeroMoreWhitespace: false },
    { oper: 'repeatBegin', captureName:'args'},
    { oper: 'identifier', doCapture:true, zeroMoreWhitespace: true },
    { oper: 'or' },
    { oper: 'literal', doCapture:true, zeroMoreWhitespace: true },
    { oper: 'repeatMatchText', text:':', zeroMoreWhitespace:true},
    { oper: 'repeatEnd' },
    { oper: 'text', text: ')', zeroMoreWhitespace: true },
  ]
  const text = 'overlay(sditno:jim:25)';
  const match = matchArr_match(text, 0, arr );
  const { keyword, args } = match.capture ;
```
