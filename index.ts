interface Src<T,U> {
	dec: {
		[key: string] : U;
	}, prog: T[]
}

function compile(src: string){
	let tok = src.split(/\s+/);
	let step = 0;
	let curtok = tok[0];
	let progs: Src<string, (string | number)[][]> = {dec:{}, prog:[]};
	if(curtok == ""){return progs;}
	function next(){
		if(curtok == ""){throw "reached eof";}
		step++;
		curtok = tok[step];
		if(typeof curtok == "undefined")curtok = "";
	}
	function declare(){
		if(curtok == "lex") {
			next();
			progs.dec[curtok] = func();
		}else{
			progs.prog.push(curtok);
			next();
			if(curtok != "."){throw "expected `.`";}
			next();
		}
	}
	function func(){
		let sents = [[]];
		let cursent: (string | number)[] = sents[0];
		let _cs = 0;
		let dofn = false;
		let las = 0;
		let maxlas = 0;
		function nextsent(){
			_cs++;
			cursent = sents[_cs] = [];
		}
		next();
		while(curtok != ".") {
			switch(curtok){
				case "la":
					if(dofn){throw "cannot put `la` after function call";}
					las++;
					if(maxlas < las) maxlas = las;
					if(las > 3) throw "too many `la` more than 3";
				break;
				
				case "lex":
				if(las > 0) {
					cursent.push("lex" + las);
					las = 0;
				}else{
					next();
					cursent.push("do" + curtok);
					dofn = true;
				}
				break;
				
				case "elx":
				case "melx":
				case "pelx":
				dofn = false;
				if(curtok != "elx")cursent.push(curtok);
				cursent.push(maxlas);
				maxlas = 0;
				nextsent();
				break;
				
				default:
				cursent.push(curtok);
			}
			next();
		}
		cursent.push(maxlas);
		next();
		return sents;
	}
	while(curtok != ""){declare();}
	return progs;
}

function interpret(src: Src<string, (string | number)[][]>){
	let stack: number[] = [];
	(document.getElementById("output")! as HTMLTextAreaElement).value = "";
	function dofunc(fname: string){
		let func: (string | number)[][] = src.dec[fname];
		if(typeof func == "undefined") throw "function `" + fname + "` is not defined";
		
		for (let snum=0;snum<func.length; snum++){
			let sent: (string | number)[] = func[snum];
			let howmany: number = (() => {
				const last = sent[sent.length-1];
				if (typeof last !== "number") {
					throw new Error("should not happen");
				}
				return last;
			})();
			let lexes: number[] = [];
			for(let i=0; i<howmany; i++)lexes.push(stack.pop()!);
			for(let op of sent){
				if(typeof op == "number")break;
				if(op == "lex1"){stack.push(lexes[0]);}
				else if(op == "lex2"){stack.push(lexes[1]);}
				else if(op == "lex3"){stack.push(lexes[2]);}
				else if(op == "pelx"){snum+=stack.pop()!;}
				else if(op == "melx"){let jump =stack.pop()!; if(stack.pop()==0)snum+=jump;}
				else if(op[0] == "d" && op[1] == "o"){
					if(op == "doxel"){
						(document.getElementById("output")! as HTMLTextAreaElement).value += String.fromCharCode(stack.pop()!);
					}else if(op == "doata"){
						stack.push(stack.pop()!+stack.pop()!);
					}
					else dofunc(op.substr(2));
				}
				else{stack.push(Number(op));}
			}
		}
	}
	for(let i of src.prog){
		dofunc(i);
	}
	document.getElementById("stack")!.innerText = "["+stack.join("][")+"]";
}

let stepgen = steprun(compile(''));

function* steprun(src: Src<string, (string | number)[][]>){
	let stack: number[] = [];
	(document.getElementById("output")! as HTMLTextAreaElement).value = "";
	function dispstack(){
		document.getElementById("stack")!.innerText = "["+stack.join("][")+"]";
	}
	function* dofunc(fname: string){
		let func = src.dec[fname];
		if(typeof func == "undefined") throw "function `" + fname + "` is not defined";
		
		for (let snum=0;snum<func.length; snum++){
			let sent = func[snum];
			let howmany = sent[sent.length-1];
			let lexes = [];
			for(let i=0; i<howmany; i++)lexes.push(stack.pop());
			for(let op of sent){
				if(typeof op == "number")break;
				if(op == "lex1"){stack.push(lexes[0]!);}
				else if(op == "lex2"){stack.push(lexes[1]!);}
				else if(op == "lex3"){stack.push(lexes[2]!);}
				else if(op == "pelx"){snum+=stack.pop()!;}
				else if(op == "melx"){let jump =stack.pop()!; if(stack.pop()==0)snum+=jump;}
				else if(op[0] == "d" && op[1] == "o"){
					if(op == "doxel"){
						(document.getElementById("output")! as HTMLTextAreaElement).value += String.fromCharCode(stack.pop()!);
					}else if(op == "doata"){
						stack.push(stack.pop()!+stack.pop()!);
					}else{
						let gen = dofunc(op.substr(2));
						while(!gen.next().done)yield dispstack();
					}
				}
				else{stack.push(Number(op));}
				yield dispstack();
			}
		}
	}
	for(let i of src.prog){
		let gen = dofunc(i);
		while(!gen.next().done)yield dispstack();
	}
}
