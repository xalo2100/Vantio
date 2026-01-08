import { supabase } from '../lib/supabase';

/**
 * Script para actualizar el rol del usuario a super_admin
 * Ejecuta este archivo con: node src/scripts/update-role.js
 */

async function updateUserRole() {
    try {
        console.log('🔄 Actualizando rol de usuario...');

        const email = 'gonzalosanchezmarambio@gmail.com';

        // Actualizar el rol
        const { data, error } = await supabase
            .from('profiles')
            .update({ role: 'super_admin' })
            .eq('email', email)
            .select();

        if (error) {
            console.error('❌ Error al actualizar:', error);
            return;
        }

        console.log('✅ Rol actualizado exitosamente!');
        console.log('📊 Datos actualizados:', data);

        // Verificar el cambio
        const { data: profile, error: fetchError } = await supabase
            .from('profiles')
            .select('email, role, organization_id')
            .eq('email', email)
            .single();

        if (fetchError) {
            console.error('❌ Error al verificar:', fetchError);
            return;
        }

        console.log('\n📋 Perfil actual:');
        console.log('   Email:', profile.email);
        console.log('   Rol:', profile.role);
        console.log('   Organization ID:', profile.organization_id);

        if (profile.role === 'super_admin') {
            console.log('\n🎉 ¡Éxito! Tu rol ahora es super_admin');
            console.log('👉 Recarga la aplicación para ver los cambios');
        }

    } catch (err) {
        console.error('💥 Error inesperado:', err);
    }
}

updateUserRole();
