<?php
defined( 'ABSPATH' ) || exit;

/**
 * Envia o subscritor para a plataforma de email configurada.
 *
 * @return true|WP_Error
 */
function nlfp_sync_to_provider( $email, $first_name, $settings ) {
	switch ( $settings['provider'] ) {
		case 'brevo':
			return nlfp_sync_brevo( $email, $first_name, $settings );
		case 'mailchimp':
			return nlfp_sync_mailchimp( $email, $first_name, $settings );
		default:
			return true;
	}
}

function nlfp_sync_brevo( $email, $first_name, $settings ) {
	if ( ! $settings['brevo_api_key'] || ! $settings['brevo_list_id'] ) {
		return new WP_Error( 'nlfp_config', 'Brevo: falta a API key ou o ID da lista.' );
	}

	$response = wp_remote_post(
		'https://api.brevo.com/v3/contacts',
		array(
			'timeout' => 10,
			'headers' => array(
				'api-key'      => $settings['brevo_api_key'],
				'Content-Type' => 'application/json',
				'Accept'       => 'application/json',
			),
			'body'    => wp_json_encode(
				array(
					'email'         => $email,
					'attributes'    => array( 'FIRSTNAME' => $first_name ),
					'listIds'       => array( (int) $settings['brevo_list_id'] ),
					'updateEnabled' => true,
				)
			),
		)
	);

	return nlfp_check_response( $response, 'Brevo' );
}

function nlfp_sync_mailchimp( $email, $first_name, $settings ) {
	$key  = $settings['mailchimp_api_key'];
	$list = $settings['mailchimp_audience_id'];
	if ( ! $key || ! $list || false === strpos( $key, '-' ) ) {
		return new WP_Error( 'nlfp_config', 'Mailchimp: API key inválida ou falta o Audience ID.' );
	}

	// O datacenter vem no fim da API key (ex.: xxxx-us21).
	$dc  = substr( $key, strrpos( $key, '-' ) + 1 );
	$url = sprintf( 'https://%s.api.mailchimp.com/3.0/lists/%s/members/%s', $dc, rawurlencode( $list ), md5( strtolower( $email ) ) );

	$response = wp_remote_request(
		$url,
		array(
			'method'  => 'PUT',
			'timeout' => 10,
			'headers' => array(
				'Authorization' => 'Basic ' . base64_encode( 'nlfp:' . $key ),
				'Content-Type'  => 'application/json',
			),
			'body'    => wp_json_encode(
				array(
					'email_address' => $email,
					'status_if_new' => $settings['mailchimp_double_optin'] ? 'pending' : 'subscribed',
					'merge_fields'  => array( 'FNAME' => $first_name ),
				)
			),
		)
	);

	return nlfp_check_response( $response, 'Mailchimp' );
}

function nlfp_check_response( $response, $provider ) {
	if ( is_wp_error( $response ) ) {
		return $response;
	}
	$code = wp_remote_retrieve_response_code( $response );
	if ( $code >= 200 && $code < 300 ) {
		return true;
	}
	return new WP_Error( 'nlfp_provider', sprintf( '%s respondeu %d: %s', $provider, $code, wp_remote_retrieve_body( $response ) ) );
}
