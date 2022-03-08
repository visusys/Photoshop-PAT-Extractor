import {PatParser } from "./main"

(async () => {
	console.time("job");
	const pat = new PatParser();
	pat.decodeFile("C:/Users/futur/Desktop/pat-parser-master/src/True Grit Atomica-Ink-Effects.pat");
	await pat.saveImages();
	console.timeEnd("job");	
})();
