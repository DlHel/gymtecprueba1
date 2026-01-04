const fs = require('fs');
const FILE = '/var/www/gymtec/backend/src/server-clean.js';

try {
    let content = fs.readFileSync(FILE, 'utf8');

    // Marcadores
    const TECH_HEADER = "// GET /api/inventory/technicians - CREATED VIA PATCH";
    const MOV_HEADER = "// GET /api/inventory/movements - CREATED VIA PATCH";
    const ID_ROUTE = "app.get('/api/inventory/:id'";

    const startIndexTech = content.indexOf(TECH_HEADER);
    const startIndexMov = content.indexOf(MOV_HEADER);
    const startIndexId = content.indexOf(ID_ROUTE);

    if (startIndexTech === -1 || startIndexMov === -1 || startIndexId === -1) {
        console.error('❌ Could not find all markers. Aborting reorder.');
        console.log('Tech:', startIndexTech, 'Mov:', startIndexMov, 'ID:', startIndexId);
        process.exit(1);
    }

    if (startIndexTech < startIndexId && startIndexMov < startIndexId) {
        console.log('✅ Routes are already in correct order (Specifies before ID wildcard).');
        process.exit(0);
    }

    console.log('🔄 Reordering routes...');

    // Extract blocks
    // Assuming blocks end with }); and are followed by newline or another comment.
    // We will cut from Header until the beginning of the next known block or reasonable end.
    
    // Helper to extract block
    function extractBlock(startIdx) {
        // Find end: look for next "app.get" or "app.post" or "app.put" or end of file
        // This is risky.
        // Better: count braces.
        let open = 0;
        let endIdx = startIdx;
        let foundStart = false;
        for(let i=startIdx; i<content.length; i++) {
            if(content[i] === '{') { open++; foundStart=true; }
            if(content[i] === '}') { open--; }
            if(foundStart && open === 0) {
                // End of function.
                // Include closing );
                let sub = content.substring(i);
                let match = sub.match(/^\s*\);/);
                if(match) {
                    return i + match[0].length;
                }
            }
        }
        return content.length;
    }

    const endTech = extractBlock(startIndexTech);
    const techBlock = content.substring(startIndexTech, endTech);

    const endMov = extractBlock(startIndexMov);
    const movBlock = content.substring(startIndexMov, endMov);

    // Remove them from current location (careful with indices shifting)
    // We'll replace them with empty string.
    // Need to handle order.
    
    // Re-read content or splice strings?
    // Let's assume Mov is before Tech (based on my patch script: Mov inserted at 8505, Tech was appended/replaced).
    
    // Construct new content:
    // 1. Part before ID_ROUTE
    // 2. Mov Block
    // 3. Tech Block
    // 4. Part starting at ID_ROUTE
    
    // But we must remove the old blocks first.
    let newContent = content;
    
    // Remove Tech
    newContent = newContent.replace(techBlock, '');
    // Remove Mov
    newContent = newContent.replace(movBlock, '');
    
    // Insert before ID
    const insertPoint = newContent.indexOf(ID_ROUTE);
    const finalContent = newContent.slice(0, insertPoint) + 
                         '\n' + movBlock + '\n\n' + techBlock + '\n\n' + 
                         newContent.slice(insertPoint);

    fs.writeFileSync(FILE, finalContent);
    console.log('✅ Routes reordered successfully.');

} catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
}
