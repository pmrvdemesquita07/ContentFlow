<?php
defined( 'ABSPATH' ) || exit;

add_action( 'wp_enqueue_scripts', 'nlfp_register_assets' );
add_filter( 'the_content', 'nlfp_append_form', 20 );
add_filter( 'body_class', 'nlfp_body_class' );
add_shortcode( 'newsletter', 'nlfp_render_form' );

add_action( 'admin_post_nopriv_nlfp_subscribe', 'nlfp_handle_subscribe' );
add_action( 'admin_post_nlfp_subscribe', 'nlfp_handle_subscribe' );
add_action( 'wp_ajax_nopriv_nlfp_subscribe', 'nlfp_handle_subscribe' );
add_action( 'wp_ajax_nlfp_subscribe', 'nlfp_handle_subscribe' );

function nlfp_messages() {
	$s = nlfp_settings();
	return array(
		'ok'      => $s['success'],
		'exists'  => 'Este e-mail já está subscrito. Obrigado!',
		'invalid' => 'Preencha o nome, o apelido e um e-mail válido.',
		'consent' => 'Tem de aceitar a política de privacidade.',
		'rate'    => 'Demasiadas tentativas. Tente novamente daqui a uns minutos.',
		'error'   => 'Ocorreu um erro. Tente novamente.',
	);
}

/** O bloco aparece automaticamente nesta página? */
function nlfp_should_auto_insert() {
	$s = nlfp_settings();
	if ( ! $s['enabled'] || empty( $s['post_types'] ) || ! is_singular( $s['post_types'] ) ) {
		return false;
	}
	$excluded = array_map( 'absint', array_filter( explode( ',', $s['exclude_ids'] ) ) );
	return ! in_array( (int) get_queried_object_id(), $excluded, true );
}

function nlfp_register_assets() {
	wp_register_style( 'nlfp', NLFP_URL . 'assets/newsletter.css', array(), NLFP_VERSION );
	wp_register_script( 'nlfp', NLFP_URL . 'assets/newsletter.js', array(), NLFP_VERSION, true );
	wp_localize_script(
		'nlfp',
		'nlfpData',
		array(
			'ajaxUrl'  => admin_url( 'admin-ajax.php' ),
			'messages' => nlfp_messages(),
		)
	);

	// Carregar o CSS no <head> evita o "salto" visual quando o bloco é inserido automaticamente.
	if ( nlfp_should_auto_insert() ) {
		wp_enqueue_style( 'nlfp' );
	}
}

function nlfp_body_class( $classes ) {
	if ( nlfp_should_auto_insert() && nlfp_settings()['full_width'] ) {
		$classes[] = 'nlfp-has-band';
	}
	return $classes;
}

function nlfp_append_form( $content ) {
	if ( is_admin() || ! in_the_loop() || ! is_main_query() || ! nlfp_should_auto_insert() ) {
		return $content;
	}
	// Se a página já usa o shortcode, não duplicar.
	$post = get_post();
	if ( $post && has_shortcode( $post->post_content, 'newsletter' ) ) {
		return $content;
	}
	return $content . nlfp_render_form();
}

function nlfp_render_form() {
	static $instance = 0;
	$instance++;

	$s = nlfp_settings();
	wp_enqueue_style( 'nlfp' );
	wp_enqueue_script( 'nlfp' );

	$uid     = 'nlfp-' . $instance;
	$status  = isset( $_GET['nlfp'] ) ? sanitize_key( wp_unslash( $_GET['nlfp'] ) ) : '';
	$message = nlfp_messages()[ $status ] ?? '';
	$privacy = get_privacy_policy_url() ?: home_url( '/politica-de-privacidade/' );
	$consent = str_replace( '{privacidade}', esc_url( $privacy ), $s['consent'] );
	$logo    = $s['logo_id'] ? wp_get_attachment_image_url( $s['logo_id'], 'full' ) : '';

	$style = sprintf(
		'--nlfp-bg:%s;--nlfp-text:%s;--nlfp-watermark:%s;%s',
		$s['bg_color'],
		$s['text_color'],
		$s['watermark_color'],
		$logo ? '--nlfp-logo:url(' . esc_url( $logo ) . ');' : ''
	);

	$classes = 'nlfp' . ( $s['full_width'] ? ' nlfp--full' : '' ) . ( $logo ? ' nlfp--has-logo' : '' );

	ob_start();
	?>
	<section id="<?php echo esc_attr( $uid ); ?>" class="<?php echo esc_attr( $classes ); ?>" style="<?php echo esc_attr( $style ); ?>" aria-labelledby="<?php echo esc_attr( $uid ); ?>-title">
		<?php if ( $logo ) : ?>
			<span class="nlfp__watermark" aria-hidden="true"></span>
		<?php endif; ?>

		<div class="nlfp__inner">
			<div class="nlfp__intro">
				<h2 id="<?php echo esc_attr( $uid ); ?>-title" class="nlfp__title"><?php echo esc_html( $s['title'] ); ?></h2>
				<?php if ( $s['description'] ) : ?>
					<p class="nlfp__desc"><?php echo nl2br( esc_html( $s['description'] ) ); ?></p>
				<?php endif; ?>
			</div>

			<form class="nlfp__form" method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
				<input type="hidden" name="action" value="nlfp_subscribe">
				<input type="hidden" name="nlfp_source" value="<?php echo esc_url( get_permalink() ?: home_url( '/' ) ); ?>">
				<input type="hidden" name="nlfp_anchor" value="<?php echo esc_attr( $uid ); ?>">

				<?php // Campo-armadilha para bots: invisível para pessoas. ?>
				<div class="nlfp__hp" aria-hidden="true">
					<label>Website <input type="text" name="nlfp_website" tabindex="-1" autocomplete="off"></label>
				</div>

				<div class="nlfp__row">
					<div class="nlfp__field">
						<label for="<?php echo esc_attr( $uid ); ?>-first">Primeiro Nome <span class="nlfp__req">*</span></label>
						<input id="<?php echo esc_attr( $uid ); ?>-first" type="text" name="nlfp_first_name" placeholder="Nome" autocomplete="given-name" maxlength="100" required>
					</div>
					<div class="nlfp__field">
						<label for="<?php echo esc_attr( $uid ); ?>-last">Apelido <span class="nlfp__req">*</span></label>
						<input id="<?php echo esc_attr( $uid ); ?>-last" type="text" name="nlfp_last_name" placeholder="Apelido" autocomplete="family-name" maxlength="100" required>
					</div>
				</div>

				<div class="nlfp__field nlfp__field--email">
					<label for="<?php echo esc_attr( $uid ); ?>-email">Endereço de e-mail <span class="nlfp__req">*</span></label>
					<input id="<?php echo esc_attr( $uid ); ?>-email" type="email" name="nlfp_email" placeholder="nome@exemplo.com" autocomplete="email" maxlength="190" required>
				</div>

				<label class="nlfp__consent">
					<input type="checkbox" name="nlfp_consent" value="1" required>
					<span><?php echo wp_kses_post( $consent ); ?> <span class="nlfp__req">*</span></span>
				</label>

				<button type="submit" class="nlfp__btn"><?php echo esc_html( $s['button'] ); ?></button>

				<p class="nlfp__msg<?php echo 'ok' === $status || 'exists' === $status ? ' is-success' : ( $message ? ' is-error' : '' ); ?>" role="status" aria-live="polite"><?php echo esc_html( $message ); ?></p>
			</form>
		</div>
	</section>
	<?php
	return ob_get_clean();
}

/**
 * Valida e grava a subscrição.
 *
 * @return string Código do resultado (chave de nlfp_messages()).
 */
function nlfp_process_subscription( array $data ) {
	// Bot apanhado no campo-armadilha: fingimos sucesso e não gravamos nada.
	if ( ! empty( $data['nlfp_website'] ) ) {
		return 'ok';
	}

	$email      = sanitize_email( $data['nlfp_email'] ?? '' );
	$first_name = sanitize_text_field( $data['nlfp_first_name'] ?? '' );
	$last_name  = sanitize_text_field( $data['nlfp_last_name'] ?? '' );

	if ( ! is_email( $email ) || '' === $first_name || '' === $last_name ) {
		return 'invalid';
	}
	if ( empty( $data['nlfp_consent'] ) ) {
		return 'consent';
	}

	// Limite simples: 5 tentativas por IP a cada 10 minutos.
	$ip       = isset( $_SERVER['REMOTE_ADDR'] ) ? sanitize_text_field( wp_unslash( $_SERVER['REMOTE_ADDR'] ) ) : '';
	$rate_key = 'nlfp_rl_' . md5( $ip );
	$attempts = (int) get_transient( $rate_key );
	if ( $attempts >= 5 ) {
		return 'rate';
	}
	set_transient( $rate_key, $attempts + 1, 10 * MINUTE_IN_SECONDS );

	$source = esc_url_raw( $data['nlfp_source'] ?? '' );
	$id     = nlfp_add_subscriber( strtolower( $email ), $first_name, $last_name, $source );

	if ( 'exists' === $id ) {
		return 'exists';
	}
	if ( ! $id ) {
		return 'error';
	}

	$synced = nlfp_sync_to_provider( $email, $first_name, $last_name, nlfp_settings() );
	if ( is_wp_error( $synced ) ) {
		// O subscritor fica guardado no WordPress; o erro aparece na lista de subscritores.
		error_log( '[Newsletter no Fim da Página] ' . $synced->get_error_message() );
		nlfp_set_sync_status( $id, 'erro' );
	} elseif ( 'none' !== nlfp_settings()['provider'] ) {
		nlfp_set_sync_status( $id, nlfp_settings()['provider'] );
	}

	return 'ok';
}

function nlfp_handle_subscribe() {
	$data = wp_unslash( $_POST ); // phpcs:ignore WordPress.Security.NonceVerification -- formulário público; protegido por honeypot e limite por IP.
	$code = nlfp_process_subscription( (array) $data );
	$msg  = nlfp_messages()[ $code ];

	if ( wp_doing_ajax() ) {
		if ( 'ok' === $code || 'exists' === $code ) {
			wp_send_json_success( array( 'message' => $msg ) );
		}
		wp_send_json_error( array( 'message' => $msg ), 400 );
	}

	// Sem JavaScript: voltar à página de origem com a mensagem.
	$source = wp_validate_redirect( esc_url_raw( $data['nlfp_source'] ?? '' ), home_url( '/' ) );
	$anchor = sanitize_html_class( $data['nlfp_anchor'] ?? 'nlfp-1' );
	wp_safe_redirect( add_query_arg( 'nlfp', $code, $source ) . '#' . $anchor );
	exit;
}
