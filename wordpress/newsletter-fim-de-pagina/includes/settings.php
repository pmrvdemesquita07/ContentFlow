<?php
defined( 'ABSPATH' ) || exit;

function nlfp_default_settings() {
	return array(
		'enabled'               => 1,
		'post_types'            => array( 'page', 'post' ),
		'exclude_ids'           => '',
		'full_width'            => 1,
		'title'                 => 'Mantenha-se atualizado',
		'description'           => 'Receba as últimas notícias diretamente no seu e-mail.',
		'button'                => 'Subscrever',
		// {privacidade} é substituído pelo URL da página de privacidade definida em Definições > Privacidade.
		'consent'               => 'Li e aceito a <a href="{privacidade}">política de privacidade</a>',
		'success'               => 'Obrigado! A sua subscrição foi registada.',
		'bg_color'              => '#e1e8ef',
		'text_color'            => '#2b4558',
		'watermark_color'       => '#b5bdc6',
		'logo_id'               => 0,
		'provider'              => 'none',
		'brevo_api_key'         => '',
		'brevo_list_id'         => '',
		'mailchimp_api_key'     => '',
		'mailchimp_audience_id' => '',
		'mailchimp_double_optin' => 0,
	);
}

function nlfp_settings() {
	return wp_parse_args( get_option( 'nlfp_settings', array() ), nlfp_default_settings() );
}

function nlfp_sanitize_settings( $in ) {
	$defaults = nlfp_default_settings();
	$in       = (array) $in;
	$out      = array();

	$out['enabled']    = empty( $in['enabled'] ) ? 0 : 1;
	$out['full_width'] = empty( $in['full_width'] ) ? 0 : 1;
	$out['post_types'] = array_values( array_intersect( (array) ( $in['post_types'] ?? array() ), get_post_types( array( 'public' => true ) ) ) );

	$ids                = array_filter( array_map( 'absint', explode( ',', (string) ( $in['exclude_ids'] ?? '' ) ) ) );
	$out['exclude_ids'] = implode( ',', $ids );

	foreach ( array( 'title', 'button', 'success' ) as $key ) {
		$out[ $key ] = sanitize_text_field( $in[ $key ] ?? $defaults[ $key ] );
	}
	$out['description'] = sanitize_textarea_field( $in['description'] ?? '' );
	$out['consent']     = wp_kses(
		$in['consent'] ?? $defaults['consent'],
		array(
			'a'      => array( 'href' => array(), 'target' => array(), 'rel' => array() ),
			'strong' => array(),
			'em'     => array(),
		)
	);

	foreach ( array( 'bg_color', 'text_color', 'watermark_color' ) as $key ) {
		$out[ $key ] = sanitize_hex_color( $in[ $key ] ?? '' ) ?: $defaults[ $key ];
	}
	$out['logo_id'] = absint( $in['logo_id'] ?? 0 );

	$out['provider']               = in_array( $in['provider'] ?? '', array( 'none', 'brevo', 'mailchimp' ), true ) ? $in['provider'] : 'none';
	$out['brevo_api_key']          = sanitize_text_field( $in['brevo_api_key'] ?? '' );
	$out['brevo_list_id']          = absint( $in['brevo_list_id'] ?? 0 ) ?: '';
	$out['mailchimp_api_key']      = sanitize_text_field( $in['mailchimp_api_key'] ?? '' );
	$out['mailchimp_audience_id']  = sanitize_text_field( $in['mailchimp_audience_id'] ?? '' );
	$out['mailchimp_double_optin'] = empty( $in['mailchimp_double_optin'] ) ? 0 : 1;

	return $out;
}
