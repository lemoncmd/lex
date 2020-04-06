interface Src<T,U> {
	dec: {
		[key: string] : U;
	}, prog: T[]
}

type Operation = {foobar: string};

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
					cursent.push({foobar: "lex" + las});
					las = 0;
				}else{
					next();
					cursent.push({foobar: "do" + curtok});
					dofn = true;
				}
				break;
				
				case "elx":
				case "melx":
				case "pelx":
				dofn = false;
				if(curtok !== "elx")cursent.push({foobar: curtok});
				cursent.unshift({foobar: "pop" + maxlas});
				maxlas = 0;
				nextsent();
				break;
				
				default:
				cursent.push({foobar: curtok});
			}
			next();
		}
		cursent.unshift({foobar: "pop" + maxlas});
		next();
		return sents;
	}
	while(curtok !== ""){declare();}
	return progs;
}

let stepgen = steprun(compile(''));


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
				opelem.innerText = op.foobar;
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
				if(op.foobar.slice(0,3) === "lex"){stack.push(lexes[Number(op.foobar.slice(3))-1]!);}
				else if(op.foobar.slice(0,3) === "pop"){
					const howmany = Number(op.foobar.slice(3));
					for(let i=0; i<howmany; i++)lexes.push(stack.pop());
				}
				else if(op.foobar === "pelx"){snum+=stack.pop()!;}
				else if(op.foobar === "melx"){let jump =stack.pop()!; if(stack.pop() === 0)snum+=jump;}
				else if(op.foobar.slice(0, 2) === "do"){
					if(op.foobar === "doxel"){
						(document.getElementById("output")! as HTMLTextAreaElement).value += String.fromCharCode(stack.pop()!);
					}else if(op.foobar === "doata"){
						stack.push(stack.pop()!+stack.pop()!);
					}else{
						let gen = dofunc(op.foobar.substr(2));
						while(!gen.next().done)yield dispstack();
					}
				}
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
