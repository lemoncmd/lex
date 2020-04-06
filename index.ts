interface Src<T,U> {
	dec: {
		[key: string] : U;
	}, prog: T[]
}

type Operation = "melx" | "pelx" 
	| {type: "execute", fname: string} 
	| {type: "pop", howmany: number}
	| {type: "foobar", foobar: string};

function replaceEoLexToElx(tokens: readonly string[]): string[] {
	const ans: string[] = [];

	for (let i = 0; i < tokens.length; i++) {
		if (tokens[i] === "eo" && (i + 1 < tokens.length) && tokens[i+1] === "lex") {
			ans.push("elx");
			i++;
		} else {
			ans.push(tokens[i]);
		}
	}

	return ans;
}

function compile(src: string){
	let tok = src.split(/\s+/);
	tok = replaceEoLexToElx(tok);
	let step = 0;
	let curtok = tok[0];
	let progs: Src<string, Operation[][]> = {dec:{}, prog:[]};
	if(curtok === ""){return progs;}
	function next(){
		if(curtok === ""){throw "reached eof";}
		step++;
		curtok = tok[step];
		if(typeof curtok === "undefined")curtok = "";
	}
	function declare(){
		if(curtok === "lex") {
			next();
			progs.dec[curtok] = func();
		}else{
			progs.prog.push(curtok);
			next();
			if(curtok !== "."){throw "expected `.`";}
			next();
		}
	}
	function func(){
		let sents: Operation[][] = [[]];
		let cursent: Operation[] = sents[0];
		let _cs = 0;
		let dofn = false;
		let las = 0;
		let maxlas = 0;
		function nextsent(){
			_cs++;
			cursent = sents[_cs] = [];
		}
		next();
		while(curtok !== ".") {
			switch(curtok){
				case "la":
					if(dofn){throw "cannot put `la` after function call";}
					las++;
					if(maxlas < las) maxlas = las;
					if(las > 3) throw "too many `la` more than 3";
				break;
				
				case "lex":
				if(las > 0) {
					cursent.push({type: "foobar", foobar: "lex" + las});
					las = 0;
				}else{
					next();
					cursent.push({type: "execute", fname: curtok});
					dofn = true;
				}
				break;
				
				case "elx":
				case "melx":
				case "pelx":
				dofn = false;
				if(curtok !== "elx")cursent.push(curtok);
				cursent.unshift({type: "pop", howmany: maxlas});
				maxlas = 0;
				nextsent();
				break;
				
				default:
				cursent.push({type: "foobar", foobar: curtok});
			}
			next();
		}
		cursent.unshift({type: "pop", howmany: maxlas});
		next();
		return sents;
	}
	while(curtok !== ""){declare();}
	return progs;
}

let stepgen = steprun(compile(''));

function stringifyOperation(op: Operation) {
	if(op === "melx" || op === "pelx") { 
		return op; 
	} else if (op.type === "execute") {
		return "execute " + op.fname;
	} else if (op.type === "pop") {
		return `pop ${op.howmany} elem${op.howmany === 1 ? "" : "s"}`;
	} else {
		return op.foobar;
	}
}

function* steprun(src: Src<string, Operation[][]>){
	let stack: number[] = [];

	(document.getElementById("output")! as HTMLTextAreaElement).value = "";
	function dispstack(){
		document.getElementById("stack")!.innerText = "["+stack.join("][")+"]";
	}

	let compiled = document.getElementById("compiled")! as HTMLDivElement; 
	compiled.innerHTML = "";
	
	for(let i in src.dec){
		let def = document.createElement("div");
		let fname = document.createElement("div");
		let content = document.createElement("div");
		def.appendChild(fname);
		def.appendChild(content);
		def.classList.add("def");

		fname.innerText = i + ":";

		content.classList.add("def-content");
		content.id = "content-" + i;
		for(let sent of src.dec[i]){
			let sentelem = document.createElement("div");
			sentelem.classList.add("sent");

			for(let op of sent){
				let opelem = document.createElement("span");
				opelem.innerText = stringifyOperation(op);
				sentelem.appendChild(opelem);
			}

			content.appendChild(sentelem);
		}

		compiled.appendChild(def);
	}
	yield dispstack();

	function* dofunc(fname: string){
		let func: Operation[][] = src.dec[fname];
		if(typeof func === "undefined") throw "function `" + fname + "` is not defined";
		let content = (document.getElementById("content-" + fname)! as HTMLDivElement).children;

		for (let snum=0;snum<func.length; snum++){
			let sentelem = content[snum];
			let sent: Operation[] = func[snum];
			let lexes = [];
			let opnum = 0;
			for(let op of sent){
				if(op === "pelx"){snum+=stack.pop()!;}
				else if(op === "melx"){let jump =stack.pop()!; if(stack.pop() === 0)snum+=jump;}
				else if(op.type === "execute"){
					if(op.fname === "xel"){
						(document.getElementById("output")! as HTMLTextAreaElement).value += String.fromCharCode(stack.pop()!);
					}else if(op.fname === "ata"){
						stack.push(stack.pop()!+stack.pop()!);
					}else{
						let gen = dofunc(op.fname);
						while(!gen.next().done)yield dispstack();
					}
				}
				else if(op.type === "pop"){
					const howmany = op.howmany;
					for(let i=0; i<howmany; i++)lexes.push(stack.pop());
				}
				else if(op.foobar.slice(0,3) === "lex"){stack.push(lexes[Number(op.foobar.slice(3))-1]!);}
				else{stack.push(Number(op.foobar));}
				sentelem.children[opnum].classList.add("current-op");
				yield dispstack();
				sentelem.children[opnum].classList.remove("current-op");
				opnum++;
			}
		}
	}
	for(let i of src.prog){
		let gen = dofunc(i);
		while(!gen.next().done)yield dispstack();
	}
}
