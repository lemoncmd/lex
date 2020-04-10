"use strict";
function replaceEoLexToElx(tokens) {
    const ans = [];
    for (let i = 0; i < tokens.length; i++) {
        if (tokens[i] === "eo" && (i + 1 < tokens.length) && tokens[i + 1] === "lex") {
            ans.push("elx");
            i++;
        }
        else {
            ans.push(tokens[i]);
        }
    }
    return ans;
}
function compile(src) {
    let tok = src.split(/\s+/);
    tok = replaceEoLexToElx(tok);
    let step = 0;
    let curtok = tok[0];
    let progs = { dec: {}, prog: [] };
    if (curtok === "") {
        return progs;
    }
    function next() {
        if (curtok === "") {
            throw "reached eof";
        }
        step++;
        curtok = tok[step];
        if (typeof curtok === "undefined")
            curtok = "";
    }
    function declare() {
        if (curtok === "lex") {
            next();
            progs.dec[curtok] = func();
        }
        else {
            progs.prog.push(curtok);
            next();
            if (curtok !== ".") {
                throw "expected `.`";
            }
            next();
        }
    }
    function func() {
        let sents = [[]];
        let cursent = sents[0];
        let _cs = 0;
        let dofn = false;
        let las = 0;
        let maxlas = 0;
        function nextsent() {
            _cs++;
            cursent = sents[_cs] = [];
        }
        next();
        while (curtok !== ".") {
            switch (curtok) {
                case "la":
                    if (dofn) {
                        throw "cannot put `la` after function call";
                    }
                    las++;
                    if (maxlas < las)
                        maxlas = las;
                    if (las > 3)
                        throw "too many `la` more than 3";
                    break;
                case "lex":
                    if (las > 0) {
                        cursent.push({ type: "la lex", degree: las });
                        las = 0;
                    }
                    else {
                        next();
                        cursent.push({ type: "execute", fname: curtok });
                        dofn = true;
                    }
                    break;
                case "elx":
                case "melx":
                case "pelx":
                    dofn = false;
                    if (curtok !== "elx")
                        cursent.push(curtok);
                    cursent.unshift({ type: "pop", howmany: maxlas });
                    maxlas = 0;
                    nextsent();
                    break;
                case "l'is":
                    next();
                    cursent.push({ type: "l'is", vname: curtok });
                    break;
                case "xale":
                    next();
                    cursent.push({ type: "xale", vname: curtok });
                    break;
                default:
                    cursent.push({ type: "push", value: tokenToValue(curtok) });
            }
            next();
        }
        cursent.unshift({ type: "pop", howmany: maxlas });
        next();
        return sents;
    }
    while (curtok !== "") {
        declare();
    }
    return progs;
}
function tokenToValue(tok) {
    return Number(tok);
}
function stringifyValue(v) {
    return v + "";
}
let stepgen = steprun(compile(''));
function stringifyOperation(op) {
    if (op === "melx" || op === "pelx") {
        return op;
    }
    else if (op.type === "execute") {
        return "execute " + op.fname;
    }
    else if (op.type === "l'is") {
        return `save to ${op.vname}`;
    }
    else if (op.type === "xale") {
        return `copy ${op.vname}`;
    }
    else if (op.type === "pop") {
        return `pop ${op.howmany} elem${op.howmany === 1 ? "" : "s"}`;
    }
    else if (op.type === "la lex") {
        return `push ${"la ".repeat(op.degree)}lex`;
    }
    else {
        return `push ${stringifyValue(op.value)}`;
    }
}
function* steprun(src) {
    let stack = [];
    let vars = {};
    document.getElementById("output").value = "";
    function dispstack() {
        document.getElementById("stack").innerText = "[" + stack.join("][") + "]";
        let saved = [];
        for (let i in vars) {
            saved.push(`${i}: [${vars[i].join("][")}]`);
        }
        document.getElementById("saved").innerText = saved.join("\n");
    }
    let compiled = document.getElementById("compiled");
    compiled.innerHTML = "";
    for (let i in src.dec) {
        let def = document.createElement("div");
        let fname = document.createElement("div");
        let content = document.createElement("div");
        def.appendChild(fname);
        def.appendChild(content);
        def.classList.add("def");
        fname.innerText = i + ":";
        content.classList.add("def-content");
        content.id = "content-" + i;
        for (let sent of src.dec[i]) {
            let sentelem = document.createElement("div");
            sentelem.classList.add("sent");
            for (let op of sent) {
                let opelem = document.createElement("span");
                opelem.innerText = stringifyOperation(op);
                sentelem.appendChild(opelem);
            }
            content.appendChild(sentelem);
        }
        compiled.appendChild(def);
    }
    yield dispstack();
    function* dofunc(fname) {
        let func = src.dec[fname];
        if (typeof func === "undefined")
            throw "function `" + fname + "` is not defined";
        let content = document.getElementById("content-" + fname).children;
        for (let snum = 0; snum < func.length; snum++) {
            let sentelem = content[snum];
            let sent = func[snum];
            let lexes = [];
            let opnum = 0;
            for (let op of sent) {
                if (op === "pelx") {
                    snum += stack.pop();
                }
                else if (op === "melx") {
                    let jump = stack.pop();
                    if (stack.pop() === 0)
                        snum += jump;
                }
                else if (op.type === "execute") {
                    if (op.fname === "xel") {
                        document.getElementById("output").value += String.fromCharCode(stack.pop());
                    }
                    else if (op.fname === "ata") {
                        stack.push(stack.pop() + stack.pop());
                    }
                    else {
                        let gen = dofunc(op.fname);
                        while (!gen.next().done)
                            yield dispstack();
                    }
                }
                else if (op.type === "pop") {
                    const howmany = op.howmany;
                    for (let i = 0; i < howmany; i++)
                        lexes.push(stack.pop());
                }
                else if (op.type === "la lex") {
                    stack.push(lexes[op.degree - 1]);
                }
                else if (op.type === "xale") {
                    stack = stack.concat(vars[op.vname]);
                }
                else if (op.type === "l'is") {
                    vars[op.vname] = [...stack];
                }
                else {
                    stack.push(op.value);
                }
                sentelem.children[opnum].classList.add("current-op");
                yield dispstack();
                sentelem.children[opnum].classList.remove("current-op");
                opnum++;
            }
        }
    }
    for (let i of src.prog) {
        let gen = dofunc(i);
        while (!gen.next().done)
            yield dispstack();
    }
}
function gen2003lk(src) {
    let result = [];
    let vars = [];
    // startup 
    result.push("'i'c");
    result.push("nta 4 f5");
    result.push("krz f5 f1");
    result.push("nta 8 f1");
    result.push("krz " + 0xa0000000.toString() + " f2");
    result.push("nta 12 f5");
    result.push("krz 0 f5@");
    result.push("nta 4 f5");
    // execution
    for (let i of src.prog) {
        result.push(`inj ${i} xx f5@`);
    }
    // cleanup
    result.push("ata 20 f5");
    result.push("krz jisesn xx");
    // primitive function
    result.push("nll ata");
    result.push("nta 4 f2");
    result.push("ata f2+4@ f2@");
    result.push("krz f5@ xx");
    // function definitions
    for (let fname in src.dec) {
        result.push("nll " + fname);
        for (let si in src.dec[fname]) {
            result.push(`nll ${fname}_${si} krz ${fname}_${si}x xx`);
        }
        for (let si in src.dec[fname]) {
            let sent = src.dec[fname][si];
            result.push(`nll ${fname}_${si}x fen`);
            for (let op of sent) {
                if (op === "melx") {
                    result.push("krz f2@ f3");
                    result.push("nta 4 f2");
                    result.push("krz f2@ f0");
                    result.push("nta 4 f2");
                    result.push("lat 4 f3 f3");
                    result.push(`ata ${fname}_${si} f3`);
                    result.push("ata 4 f3");
                    result.push("fi f0 0 clo malkrz f3 xx");
                }
                else if (op === "pelx") {
                    result.push("krz f2@ f3");
                    result.push("nta 4 f2");
                    result.push("lat 4 f3 f3");
                    result.push(`ata ${fname}_${si} f3`);
                    result.push("ata 4 f3");
                    result.push("krz f3 xx");
                }
                else
                    switch (op.type) {
                        case "execute":
                            result.push("nta 4 f5");
                            result.push(`inj ${op.fname} xx f5@`);
                            result.push("ata 4 f5");
                            break;
                        case "pop":
                            for (let i = 0; i < op.howmany; i++) {
                                result.push(`krz f2@ f1+${i * 4}@`);
                                result.push("nta 4 f2");
                            }
                            break;
                        case "push":
                            result.push("ata 4 f2");
                            result.push(`krz ${op.value < 0 ? Math.pow(2, 32) + op.value : op.value} f2@`);
                            break;
                        case "la lex":
                            result.push("ata 4 f2");
                            result.push(`krz f1+${(op.degree - 1) * 4}@ f2@`);
                            break;
                        case "xale":
                            break;
                        case "l'is":
                            break;
                    }
            }
        }
        result.push("krz f5@ xx");
    }
    // end point
    result.push("nll jisesn krz f5@ xx");
    return result.map((cur) => {
        if (typeof cur === "string")
            return cur;
        return cur.code.replace("%", (0xa0000000 + 0x100000 * (vars.indexOf(cur.variable) + 1)).toString());
    }).join("\n");
}
