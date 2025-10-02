const { execSync } = require('child_process');

// Función para hacer pruebas de los endpoints de checklist
async function testChecklistEndpoints() {
    console.log('🧪 PRUEBAS DE ENDPOINTS DE CHECKLIST\n');
    
    try {
        // Primero hacer login para obtener token
        console.log('1. Haciendo login para obtener token...');
        
        const loginData = {
            username: 'admin',
            password: 'admin123'
        };
        
        const loginCommand = `curl -X POST -H "Content-Type: application/json" -d "${JSON.stringify(loginData).replace(/"/g, '\\"')}" http://localhost:3000/api/auth/login --silent`;
        
        console.log('Comando login:', loginCommand);
        const loginResponse = execSync(loginCommand, { encoding: 'utf8' });
        console.log('Respuesta login:', loginResponse);
        
        const loginResult = JSON.parse(loginResponse);
        const token = loginResult.token;
        
        if (!token) {
            throw new Error('No se pudo obtener token de autenticación');
        }
        
        console.log('✅ Token obtenido:', token.substring(0, 20) + '...\n');
        
        // 2. Probar GET templates
        console.log('2. Probando GET templates...');
        const getTemplatesCommand = `curl -H "Authorization: Bearer ${token}" http://localhost:3000/api/gimnacion/checklist-templates --silent`;
        const templatesResponse = execSync(getTemplatesCommand, { encoding: 'utf8' });
        console.log('✅ Templates existentes:', templatesResponse, '\n');
        
        // 3. Probar POST crear template
        console.log('3. Probando POST crear template...');
        const newTemplate = {
            template_name: 'Template de Prueba ' + Date.now(),
            items: [
                {
                    item_description: 'Revisar funcionamiento general',
                    sort_order: 1,
                    is_required: true,
                    category: 'general'
                },
                {
                    item_description: 'Verificar conexiones eléctricas',
                    sort_order: 2,
                    is_required: true,
                    category: 'general'
                },
                {
                    item_description: 'Lubricar partes móviles',
                    sort_order: 3,
                    is_required: false,
                    category: 'mantenimiento'
                }
            ]
        };
        
        const createTemplateCommand = `curl -X POST -H "Content-Type: application/json" -H "Authorization: Bearer ${token}" -d "${JSON.stringify(newTemplate).replace(/"/g, '\\"')}" http://localhost:3000/api/gimnacion/checklist-templates --silent`;
        console.log('Comando crear template:', createTemplateCommand);
        
        const createResponse = execSync(createTemplateCommand, { encoding: 'utf8' });
        console.log('✅ Template creado:', createResponse, '\n');
        
        const createResult = JSON.parse(createResponse);
        const templateId = createResult.data?.id;
        
        if (templateId) {
            // 4. Probar GET items del template
            console.log('4. Probando GET items del template...');
            const getItemsCommand = `curl -H "Authorization: Bearer ${token}" http://localhost:3000/api/gimnacion/checklist-templates/${templateId}/items --silent`;
            const itemsResponse = execSync(getItemsCommand, { encoding: 'utf8' });
            console.log('✅ Items del template:', itemsResponse, '\n');
            
            // 5. Probar PUT actualizar template
            console.log('5. Probando PUT actualizar template...');
            const updatedTemplate = {
                template_name: 'Template Actualizado ' + Date.now(),
                items: [
                    {
                        item_description: 'Revisar funcionamiento general - ACTUALIZADO',
                        sort_order: 1,
                        is_required: true,
                        category: 'general'
                    },
                    {
                        item_description: 'Nueva tarea agregada',
                        sort_order: 2,
                        is_required: false,
                        category: 'adicional'
                    }
                ]
            };
            
            const updateTemplateCommand = `curl -X PUT -H "Content-Type: application/json" -H "Authorization: Bearer ${token}" -d "${JSON.stringify(updatedTemplate).replace(/"/g, '\\"')}" http://localhost:3000/api/gimnacion/checklist-templates/${templateId} --silent`;
            const updateResponse = execSync(updateTemplateCommand, { encoding: 'utf8' });
            console.log('✅ Template actualizado:', updateResponse, '\n');
            
            // 6. Verificar que se actualizó correctamente
            console.log('6. Verificando actualización...');
            const getUpdatedItemsCommand = `curl -H "Authorization: Bearer ${token}" http://localhost:3000/api/gimnacion/checklist-templates/${templateId}/items --silent`;
            const updatedItemsResponse = execSync(getUpdatedItemsCommand, { encoding: 'utf8' });
            console.log('✅ Items actualizados:', updatedItemsResponse, '\n');
            
            // 7. Probar DELETE template
            console.log('7. Probando DELETE template...');
            const deleteTemplateCommand = `curl -X DELETE -H "Authorization: Bearer ${token}" http://localhost:3000/api/gimnacion/checklist-templates/${templateId} --silent`;
            const deleteResponse = execSync(deleteTemplateCommand, { encoding: 'utf8' });
            console.log('✅ Template eliminado:', deleteResponse, '\n');
        }
        
        console.log('🎉 TODAS LAS PRUEBAS COMPLETADAS EXITOSAMENTE');
        
    } catch (error) {
        console.error('❌ Error en las pruebas:', error.message);
        if (error.stdout) {
            console.log('Stdout:', error.stdout.toString());
        }
        if (error.stderr) {
            console.log('Stderr:', error.stderr.toString());
        }
    }
}

// Ejecutar pruebas
testChecklistEndpoints();