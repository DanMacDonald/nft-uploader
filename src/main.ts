import Bundlr from '@bundlr-network/client';
import fsExtra from "fs-extra"

const jwk = JSON.parse(fsExtra.readFileSync("/Users/dmac/arweave/testWallet/PeZMM2WvY2BAOyUvIJ9hU-fqO04_2e7270TSThE93S0.json").toString());
const bundlr = new Bundlr("http://node2.bundlr.network", "arweave", jwk);

async function postBundlrTx(data: string | Uint8Array, fileName:string,  contentType:string) {
	const tags = [
		{name: "Content-Type", value: contentType},
		{name: "File", value: fileName },
		{name: "Collection", value: "winston-nft-test"}
	];

	const tx = bundlr.createTransaction(data, { tags });
	await tx.sign();
	const txid = tx.id
	//await tx.upload();
	return txid;
}

(async () => {
	// Check Balance
	const balance = await bundlr.getLoadedBalance()
	console.log(`Winstons: ${balance}`);

	// Load our files from ./images
	let fileList = [];
	let dir = "images";
	let items = await fsExtra.readdir(dir).catch(err => { if (err) throw err });
	const svgs = items.filter(item => item.split(".")[1] === "svg");

	// Upload images ans JSONs
	for (let i = 0; i < 3; i++) {
		const svgFileName = svgs[i];
		const dataSvg = fsExtra.readFileSync(`${dir}/${svgFileName}`);
		
		// Post the SVG data
		let txid = await postBundlrTx(dataSvg, svgFileName, "image/svg+xml");
		fileList.push({file: svgFileName, txid });

		// Add the image URL to the JSON
		const jsonFileName = svgFileName.replace(".svg",".json");
		const dataJson = fsExtra.readFileSync(`${dir}/${jsonFileName}`);
		const metadata = JSON.parse(dataJson.toString());
		metadata.image = `https://arweave.net/${txid}`;

		// Post the json metadata
		txid = await postBundlrTx(JSON.stringify(metadata), svgFileName, "application/json");
		fileList.push({file: jsonFileName, txid });
	}

	console.log(fileList);

	// Create a manifest JSON
	let manifest = {
		manifest: "arweave/paths",
		index: { path: fileList[0].file },
		version: "0.1.0",
		paths: {}
	}

	fileList.forEach(entry => {
		manifest.paths[entry.file] = { id: entry.txid };
	});
	console.log(manifest);

	await fsExtra.writeJson("manifest.json", manifest);

	const manifestTxid = await postBundlrTx(JSON.stringify(manifest), "manifest", "application/x.arweave-manifest+json");
	const manifestUrl = `https://arweave.net/${manifestTxid}`;
	console.log(manifestUrl);
	await fsExtra.writeJson("lastUpload.json", { url : manifestUrl })
	console.log("done");
})();