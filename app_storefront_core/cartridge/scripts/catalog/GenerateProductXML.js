// Require API's
 var XMLStreamWriter = require('dw/io/XMLStreamWriter');
 var FileWriter = require('dw/io/FileWriter');
 var File = require('dw/io/File');
 
 var CatalogMgr = require('dw/catalog/CatalogMgr');
 var ProductMgr = require('dw/catalog/ProductMgr');
 var ProductSearchModel = require('dw/catalog/ProductSearchModel');
 var Pipelet = require('dw/system/Pipelet');
 var Logger = require('dw/system/Logger');
 
/**
 * Function: execute
 *
 * Main function of the script. 
 */
function execute( pdict ) {
	pdict.Message = "";
	// Check if filename, filepath for Impex, categoryID and brand is missing then stop the execution. and Log the information to debug.
    if(empty(pdict.fileName) || empty(pdict.filePath) || empty(pdict.categoryID) || empty(pdict.brand)){
   		Logger.error("Exception caught during XML Creation and Import : empty fileName, filePath, categoryId orbrand name in job parameters");
        return PIPELET_ERROR;    
    }
    // Chech if category exist in catalog, if not then stop the execution and log the info for debugging
    var category = CatalogMgr.getCategory(pdict.categoryID);
    if(empty(category)) {
   		Logger.error("No Category Found Against Job Param categoryID");
        return PIPELET_ERROR;    
    }
    
    // Creating XML File on Impex with the given path and name in Job Parameter
    var filename  = pdict.fileName; //"product-catalog.xml"; 
    (new dw.io.File(dw.io.File.IMPEX + pdict.filePath)).mkdirs();	// Create Directory, as needed
	var file = new File(File.IMPEX + pdict.filePath + filename);
    var path = file.getPath().replace("src","");
    try {
        /* Create an output stream */
        var xsw = init(file);

        /* Process products to generate xml */
        writeProducts(xsw, pdict.brand, category);
        
        // Write the closing element, then flush & close the stream
        finalize(xsw);
        // Import the XML File to assign category to products.
        var importCatalogResult = new Pipelet('ImportCatalog').execute({
        	ImportFile: path,
        	ImportMode: "MERGE"
        });
        // Log the information if file imported successfully or not.
        if (importCatalogResult.Status.code == "IMPEX-0") {
        	Logger.info("File Imported Successfully");
        } else {
        	Logger.info("Import Status is : {0}", importCatalogResult.Status.code);
        }
        //file.remove();		// Remove xml file if we want to remove after import
            
    } catch(ex) { // Exception handling in overall generate and xml import
        Logger.error("Exception caught during XML Creation and Import: {0}", ex.message);
        return PIPELET_ERROR;    
    }    
    
    return PIPELET_NEXT;    
}

//=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
//writeProducts to prepare for product search and creation of parents xml nodes..
//* @param {'dw.io.XMLStreamWriter'} xsw XMLStreamWriter to write product xml.
//* @param {dw.catalog.Category} category for assignment.
//* @param {String} brand to search for products.
//=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-

function writeProducts(xsw, brand, category) {
	var siteCatalog = CatalogMgr.getSiteCatalog();
    xsw.writeStartElement("catalog");
    xsw.writeAttribute("xmlns", "http://www.demandware.com/xml/impex/catalog/2006-10-31");
    xsw.writeAttribute("catalog-id", siteCatalog.getID());
	/*We can also use the ProductMgr.queryAllSiteProducts if we also need offline products, but we will have to do
	 *  post processing in that case which can cause performance.
	 * var productIterator = ProductMgr.queryAllSiteProducts();
    
	  while(productIterator.hasNext()) {
	      var product = productIterator.next();
	      if(product.online && !empty(product.brand) && product.brand == brand && !product.isAssignedToCategory(category)) {
	          writeProduct(xsw, product, category.ID);
	      }
	  }
	  productIterator.close();*/
    
    // Using Search Model to get data from Search Indexes and avoid post processing
    var productSearchModel = new ProductSearchModel();
    productSearchModel.setRecursiveCategorySearch(true);
    productSearchModel.setCategoryID(siteCatalog.getRoot().getID());
    productSearchModel.addRefinementValues('brand', brand);
    productSearchModel.search();
    var productHitsIterator = productSearchModel.getProductSearchHits();
    while(productHitsIterator.hasNext()) {
	      var productSearchHit = productHitsIterator.next();
	      if (!empty(productSearchHit) && !empty(productSearchHit.product)) {
		      var product = productSearchHit.product;
		      if(!product.isAssignedToCategory(category)) {
		          writeProduct(xsw, product, category.ID);
		      }
	      }
	  }
	xsw.writeEndElement();
}

//=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
//writeProduct to write individual product data in XML.
// * @param {'dw.io.XMLStreamWriter'} xsw XMLStreamWriter to write product xml.
// * @param {dw.catalog.Product} product Product to fetch product information.
// * @param {String} categoryID to assign to product.
//=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
function writeProduct(xsw, product, categoryID) {
    xsw.writeStartElement("product");
    xsw.writeAttribute("product-id", product.ID);	
    xsw.writeEndElement();
    
    xsw.writeStartElement("category-assignment");
    xsw.writeAttribute("category-id", categoryID);
    xsw.writeAttribute("product-id", product.ID);
    xsw.writeEndElement();
}

//=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
//init to write individual product data in XML.
//* @param {'dw.io.File'} file File to setup FileWriter for XMLStreamWriter.
//=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
function init(file) {
    var fw = new FileWriter(file, "UTF-8", false);
    var xsw = new XMLStreamWriter(fw);
	    
	xsw.writeStartDocument("UTF-8", "1.0");
	xsw.writeCharacters("\n");
	  
    return xsw;
}

//=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
//finalize to flush and close the XMLStreamWriter.
//* @param {'dw.io.XMLStreamWriter'} xsw XMLStreamWriter.
//=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
function finalize(xsw) {
    xsw.flush();
    xsw.close();
}

module.exports.GenerateProductXML = execute;