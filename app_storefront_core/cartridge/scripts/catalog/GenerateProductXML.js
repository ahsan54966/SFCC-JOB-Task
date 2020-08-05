 importPackage( dw.system );
 importPackage( dw.util );
 importPackage( dw.catalog );
 importPackage( dw.object );
 importPackage( dw.io );
 
 var URLUtils = require('dw/web/URLUtils');
 var Site = require('dw/system/Site');
 
/**
 * Function: execute
 *
 * Main function of the script. 
 */
function execute( pdict : PipelineDictionary ) : Number {
	pdict.Message = "";
	
    if(empty(pdict.fileName) || empty(pdict.filePath) || empty(pdict.categoryID) || empty(pdict.brand)){
   		Logger.error("Exception caught during XML Creation and Import : empty fileName, filePath, categoryId orbrand name in job parameters");
        return PIPELET_ERROR;    
    }
    
    var category = CatalogMgr.getCategory(pdict.categoryID);
    if(empty(category)) {
   		Logger.error("No Category Found Against Job Param categoryID");
        return PIPELET_ERROR;    
    }
    
    var date : Date = new Date();
    var filename : String = pdict.fileName; //"product-catalog.xml"; 
    (new dw.io.File(dw.io.File.IMPEX + pdict.filePath)).mkdirs();	// Create Directory, as needed
	var file : File = new File(File.IMPEX + pdict.filePath + filename);
    var path = file.getPath().replace("src","");
    try {
        /* Create an output stream */
        var xsw : XMLStreamWriter = init(file);

        /* Process products */
        writeProducts(xsw, pdict.brand, category);
        
        // Write the closing element, then flush & close the stream
        finalize(xsw);
        //file.remove();		// Remove xml file
        var importCatalogResult = new Pipelet('ImportCatalog').execute({
        	ImportFile: path,
        	ImportMode: "MERGE"
        });
        
        if (importCatalogResult.Status.code == "IMPEX-0") {
        	Logger.info("File Imported Successfully");
        } else {
        	Logger.info("Import Status is : {0}", importCatalogResult.Status.code);
        }
            
    } catch(ex) {
        Logger.error("Exception caught during XML Creation and Import: {0}", ex.message);
        return PIPELET_ERROR;    
    }    
    
    return PIPELET_NEXT;    
}

//=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
//  Products
//=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-

function writeProducts(xsw : XMLStreamWriter, brand, category) {
    xsw.writeStartElement("catalog");
    xsw.writeAttribute("xmlns", "http://www.demandware.com/xml/impex/catalog/2006-10-31");
    xsw.writeAttribute("catalog-id", CatalogMgr.getSiteCatalog().getID());
	var productIterator : SeekableIterator = ProductMgr.queryAllSiteProducts();
    
	  //var count = 0;
	  while(productIterator.hasNext()) {
	      var product : Product = productIterator.next();
	      if(product.online && !empty(product.brand) && product.brand == brand && !product.isAssignedToCategory(category)) {
	          writeProduct(xsw, product, category.ID);
	      }
	  }
	  productIterator.close();
	xsw.writeEndElement();
}

function writeProduct(xsw : XMLStreamWriter, product : Product, categoryID) {
    xsw.writeStartElement("product");
    xsw.writeAttribute("product-id", product.ID);	
    xsw.writeEndElement();
    
    xsw.writeStartElement("category-assignment");
    xsw.writeAttribute("category-id", categoryID);
    xsw.writeAttribute("product-id", product.ID);
    xsw.writeEndElement();
}


function init(file : File) : XMLStreamWriter {
    var fw : FileWriter = new FileWriter(file, "UTF-8", false);
    var xsw : XMLStreamWriter = new XMLStreamWriter(fw);
	    
	xsw.writeStartDocument("UTF-8", "1.0");
	xsw.writeCharacters("\n");
	  
    return xsw;
}

function finalize(xsw : XMLStreamWriter) {
    xsw.flush();
    xsw.close();
}

module.exports.GenerateProductXML = execute;