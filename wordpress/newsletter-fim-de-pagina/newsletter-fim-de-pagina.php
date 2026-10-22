<?php
/**
 * Plugin Name:       Newsletter no Fim da Página
 * Description:       Adiciona um bloco de subscrição de newsletter (com logo em marca de água) no final de cada página. Guarda os subscritores no WordPress e, opcionalmente, envia-os para o Brevo ou Mailchimp.
 * Version:           1.0.0
 * Requires at least: 5.8
 * Requires PHP:      7.4
 * License:           GPL-2.0-or-later
 * Text Domain:       nlfp
 */

defined( 'ABSPATH' ) || exit;

define( 'NLFP_VERSION', '1.0.0' );
define( 'NLFP_DIR', plugin_dir_path( __FILE__ ) );
define( 'NLFP_URL', plugin_dir_url( __FILE__ ) );

require_once NLFP_DIR . 'includes/settings.php';
require_once NLFP_DIR . 'includes/subscribers.php';
require_once NLFP_DIR . 'includes/providers.php';
require_once NLFP_DIR . 'includes/form.php';

if ( is_admin() ) {
	require_once NLFP_DIR . 'includes/admin.php';
}

register_activation_hook( __FILE__, 'nlfp_activate' );

function nlfp_activate() {
	nlfp_create_table();
	add_option( 'nlfp_settings', nlfp_default_settings() );
}
