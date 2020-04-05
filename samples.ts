function loadSample(sampleid: number) {
    if (confirm(`delete the current source code and load sample${sampleid}?`)) {
        (document.getElementById('program')! as HTMLTextAreaElement).value = [
            'lex ekcan 6 3 7 .\nlex ysev1 la la lex .\n\nekcan .\nysev1 .',
            'lex ekcan 6 3 7 .\nlex therda la lex la lex .\nlex inferln la lex la la lex .\nlex etxaataes la lex elx la lex .\n\nekcan .\ntherda .\nekcan .\ninferln .\netxaataes .',
            'lex ekcan 3 .\nlex 2tva la lex la lex lex ata .\nlex 4tva la lex la lex lex ata\n     elx la lex la lex lex ata .\n\nekcan .\n2tva .\n4tva .',
            'lex mal2tva la lex la la lex\n     1 melx la lex la lex lex ata\n        elx la lex .\nlex ekcan1 4 3 . ekcan1 . mal2tva .\n\nlex ekcan2 0 3 . ekcan2 . mal2tva .',
            'lex xel1ad97 1 lex xel 97 lex xel .\n\nxel1ad97 .',
            'lex xeless la lex -1 lex ata\n       elx la lex la lex\n    2 melx la lex la la lex lex xel\n       elx lex xeless\n    1 pelx la la lex\n       elx la lex .\n\nlex salar 114 97 108 97 115 6 lex xeless .\n\nsalar .'
        ][sampleid - 1];
    }
}