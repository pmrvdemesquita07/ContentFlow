<?php
defined( 'ABSPATH' ) || exit;

add_action( 'admin_init', 'nlfp_admin_init' );
add_action( 'admin_menu', 'nlfp_admin_menu' );
add_action( 'admin_enqueue_scripts', 'nlfp_admin_assets' );
add_action( 'admin_post_nlfp_export', 'nlfp_export_csv' );
add_action( 'admin_post_nlfp_delete', 'nlfp_delete_subscriber' );

function nlfp_admin_init() {
	register_setting( 'nlfp', 'nlfp_settings', array( 'sanitize_callback' => 'nlfp_sanitize_settings' ) );

	// Atualizações do plugin sem reativar: garantir que a tabela existe.
	if ( get_option( 'nlfp_db_version' ) !== NLFP_VERSION ) {
		nlfp_create_table();
	}
}

function nlfp_admin_menu() {
	add_menu_page( 'Newsletter', 'Newsletter', 'manage_options', 'nlfp', 'nlfp_subscribers_page', 'dashicons-email-alt', 58 );
	add_submenu_page( 'nlfp', 'Subscritores', 'Subscritores', 'manage_options', 'nlfp', 'nlfp_subscribers_page' );
	add_submenu_page( 'nlfp', 'Definições da newsletter', 'Definições', 'manage_options', 'nlfp-settings', 'nlfp_settings_page' );
}

function nlfp_admin_assets( $hook ) {
	if ( 'newsletter_page_nlfp-settings' !== $hook ) {
		return;
	}
	wp_enqueue_media();
	wp_enqueue_style( 'wp-color-picker' );
	wp_enqueue_script( 'wp-color-picker' );
	wp_add_inline_script(
		'wp-color-picker',
		"jQuery(function($){
			$('.nlfp-color').wpColorPicker();
			var frame;
			$('#nlfp-logo-select').on('click', function(e){
				e.preventDefault();
				frame = frame || wp.media({ title: 'Escolher logo', button: { text: 'Usar este logo' }, library: { type: 'image' }, multiple: false });
				frame.off('select').on('select', function(){
					var img = frame.state().get('selection').first().toJSON();
					$('#nlfp-logo-id').val(img.id);
					$('#nlfp-logo-preview').attr('src', img.url).show();
					$('#nlfp-logo-remove').show();
				});
				frame.open();
			});
			$('#nlfp-logo-remove').on('click', function(e){
				e.preventDefault();
				$('#nlfp-logo-id').val('');
				$('#nlfp-logo-preview').hide();
				$(this).hide();
			});
			$('#nlfp-provider').on('change', function(){
				$('.nlfp-provider-row').hide().filter('[data-provider=\"' + this.value + '\"]').show();
			}).trigger('change');
		});"
	);
}

function nlfp_settings_page() {
	if ( ! current_user_can( 'manage_options' ) ) {
		return;
	}
	$s    = nlfp_settings();
	$name = 'nlfp_settings';
	$logo = $s['logo_id'] ? wp_get_attachment_image_url( $s['logo_id'], 'medium' ) : '';
	?>
	<div class="wrap">
		<h1>Definições da newsletter</h1>
		<form method="post" action="options.php">
			<?php settings_fields( 'nlfp' ); ?>

			<h2 class="title">Onde aparece</h2>
			<table class="form-table" role="presentation">
				<tr>
					<th scope="row">Ativar</th>
					<td><label><input type="checkbox" name="<?php echo $name; ?>[enabled]" value="1" <?php checked( $s['enabled'] ); ?>> Mostrar automaticamente no fim das páginas</label></td>
				</tr>
				<tr>
					<th scope="row">Tipos de conteúdo</th>
					<td>
						<?php foreach ( get_post_types( array( 'public' => true ), 'objects' ) as $type ) : ?>
							<?php if ( 'attachment' === $type->name ) { continue; } ?>
							<label style="margin-right:1rem"><input type="checkbox" name="<?php echo $name; ?>[post_types][]" value="<?php echo esc_attr( $type->name ); ?>" <?php checked( in_array( $type->name, $s['post_types'], true ) ); ?>> <?php echo esc_html( $type->labels->name ); ?></label>
						<?php endforeach; ?>
					</td>
				</tr>
				<tr>
					<th scope="row"><label for="nlfp-exclude">Excluir páginas (IDs)</label></th>
					<td><input id="nlfp-exclude" class="regular-text" type="text" name="<?php echo $name; ?>[exclude_ids]" value="<?php echo esc_attr( $s['exclude_ids'] ); ?>" placeholder="ex.: 12, 45">
						<p class="description">Separados por vírgula. O ID aparece no URL quando editas a página (<code>post=12</code>).</p></td>
				</tr>
				<tr>
					<th scope="row">Largura</th>
					<td><label><input type="checkbox" name="<?php echo $name; ?>[full_width]" value="1" <?php checked( $s['full_width'] ); ?>> Faixa a toda a largura do ecrã</label></td>
				</tr>
			</table>

			<h2 class="title">Aspeto</h2>
			<table class="form-table" role="presentation">
				<tr>
					<th scope="row">Logo (marca de água)</th>
					<td>
						<input type="hidden" id="nlfp-logo-id" name="<?php echo $name; ?>[logo_id]" value="<?php echo esc_attr( $s['logo_id'] ); ?>">
						<img id="nlfp-logo-preview" src="<?php echo esc_url( $logo ); ?>" alt="" style="max-width:200px;max-height:120px;display:<?php echo $logo ? 'block' : 'none'; ?>;margin-bottom:.5rem;background:#e1e8ef;padding:8px">
						<button type="button" class="button" id="nlfp-logo-select">Escolher logo</button>
						<button type="button" class="button-link-delete" id="nlfp-logo-remove" style="margin-left:.5rem;display:<?php echo $logo ? 'inline' : 'none'; ?>">Remover</button>
						<p class="description">Usa um <strong>PNG com fundo transparente</strong> ou um <strong>SVG</strong>. O logo é pintado numa só cor (a "cor da marca de água" abaixo), por isso as cores originais não importam.</p>
					</td>
				</tr>
				<tr>
					<th scope="row">Cor de fundo</th>
					<td><input class="nlfp-color" type="text" name="<?php echo $name; ?>[bg_color]" value="<?php echo esc_attr( $s['bg_color'] ); ?>"></td>
				</tr>
				<tr>
					<th scope="row">Cor do texto e botão</th>
					<td><input class="nlfp-color" type="text" name="<?php echo $name; ?>[text_color]" value="<?php echo esc_attr( $s['text_color'] ); ?>"></td>
				</tr>
				<tr>
					<th scope="row">Cor da marca de água</th>
					<td><input class="nlfp-color" type="text" name="<?php echo $name; ?>[watermark_color]" value="<?php echo esc_attr( $s['watermark_color'] ); ?>">
						<p class="description">Um tom ligeiramente mais escuro que o fundo dá o efeito do exemplo.</p></td>
				</tr>
			</table>

			<h2 class="title">Textos</h2>
			<table class="form-table" role="presentation">
				<tr>
					<th scope="row"><label for="nlfp-title">Título</label></th>
					<td><input id="nlfp-title" class="regular-text" type="text" name="<?php echo $name; ?>[title]" value="<?php echo esc_attr( $s['title'] ); ?>"></td>
				</tr>
				<tr>
					<th scope="row"><label for="nlfp-desc">Descrição</label></th>
					<td><textarea id="nlfp-desc" class="large-text" rows="3" name="<?php echo $name; ?>[description]"><?php echo esc_textarea( $s['description'] ); ?></textarea></td>
				</tr>
				<tr>
					<th scope="row"><label for="nlfp-button">Texto do botão</label></th>
					<td><input id="nlfp-button" class="regular-text" type="text" name="<?php echo $name; ?>[button]" value="<?php echo esc_attr( $s['button'] ); ?>"></td>
				</tr>
				<tr>
					<th scope="row"><label for="nlfp-consent">Texto de consentimento (RGPD)</label></th>
					<td><input id="nlfp-consent" class="large-text" type="text" name="<?php echo $name; ?>[consent]" value="<?php echo esc_attr( $s['consent'] ); ?>">
						<p class="description"><code>{privacidade}</code> é substituído pelo link da página definida em <a href="<?php echo esc_url( admin_url( 'options-privacy.php' ) ); ?>">Definições &rarr; Privacidade</a>.</p></td>
				</tr>
				<tr>
					<th scope="row"><label for="nlfp-success">Mensagem de sucesso</label></th>
					<td><input id="nlfp-success" class="large-text" type="text" name="<?php echo $name; ?>[success]" value="<?php echo esc_attr( $s['success'] ); ?>"></td>
				</tr>
			</table>

			<h2 class="title">Plataforma de email (opcional)</h2>
			<p>Os subscritores ficam sempre guardados em <em>Newsletter &rarr; Subscritores</em>. Se usas Brevo ou Mailchimp, também são enviados para lá automaticamente.</p>
			<table class="form-table" role="presentation">
				<tr>
					<th scope="row"><label for="nlfp-provider">Plataforma</label></th>
					<td>
						<select id="nlfp-provider" name="<?php echo $name; ?>[provider]">
							<option value="none" <?php selected( $s['provider'], 'none' ); ?>>Nenhuma (só guardar no WordPress)</option>
							<option value="brevo" <?php selected( $s['provider'], 'brevo' ); ?>>Brevo</option>
							<option value="mailchimp" <?php selected( $s['provider'], 'mailchimp' ); ?>>Mailchimp</option>
						</select>
					</td>
				</tr>
				<tr class="nlfp-provider-row" data-provider="brevo">
					<th scope="row"><label for="nlfp-brevo-key">Brevo API key</label></th>
					<td><input id="nlfp-brevo-key" class="regular-text" type="password" autocomplete="off" name="<?php echo $name; ?>[brevo_api_key]" value="<?php echo esc_attr( $s['brevo_api_key'] ); ?>">
						<p class="description">Brevo &rarr; SMTP &amp; API &rarr; API Keys.</p></td>
				</tr>
				<tr class="nlfp-provider-row" data-provider="brevo">
					<th scope="row"><label for="nlfp-brevo-list">ID da lista</label></th>
					<td><input id="nlfp-brevo-list" class="small-text" type="number" min="1" name="<?php echo $name; ?>[brevo_list_id]" value="<?php echo esc_attr( $s['brevo_list_id'] ); ?>"></td>
				</tr>
				<tr class="nlfp-provider-row" data-provider="mailchimp">
					<th scope="row"><label for="nlfp-mc-key">Mailchimp API key</label></th>
					<td><input id="nlfp-mc-key" class="regular-text" type="password" autocomplete="off" name="<?php echo $name; ?>[mailchimp_api_key]" value="<?php echo esc_attr( $s['mailchimp_api_key'] ); ?>">
						<p class="description">Termina em <code>-us21</code> (ou semelhante).</p></td>
				</tr>
				<tr class="nlfp-provider-row" data-provider="mailchimp">
					<th scope="row"><label for="nlfp-mc-list">Audience ID</label></th>
					<td><input id="nlfp-mc-list" class="regular-text" type="text" name="<?php echo $name; ?>[mailchimp_audience_id]" value="<?php echo esc_attr( $s['mailchimp_audience_id'] ); ?>"></td>
				</tr>
				<tr class="nlfp-provider-row" data-provider="mailchimp">
					<th scope="row">Double opt-in</th>
					<td><label><input type="checkbox" name="<?php echo $name; ?>[mailchimp_double_optin]" value="1" <?php checked( $s['mailchimp_double_optin'] ); ?>> Enviar email de confirmação antes de subscrever</label></td>
				</tr>
			</table>

			<?php submit_button(); ?>
		</form>

		<p>Também podes colocar o formulário manualmente em qualquer sítio com o shortcode <code>[newsletter]</code>.</p>
	</div>
	<?php
}

function nlfp_subscribers_page() {
	if ( ! current_user_can( 'manage_options' ) ) {
		return;
	}
	global $wpdb;

	$per_page = 50;
	$paged    = max( 1, absint( $_GET['paged'] ?? 1 ) );
	$total    = (int) $wpdb->get_var( 'SELECT COUNT(*) FROM ' . nlfp_table() );
	$rows     = $wpdb->get_results( $wpdb->prepare( 'SELECT * FROM ' . nlfp_table() . ' ORDER BY created_at DESC LIMIT %d OFFSET %d', $per_page, ( $paged - 1 ) * $per_page ) );
	$export   = wp_nonce_url( admin_url( 'admin-post.php?action=nlfp_export' ), 'nlfp_export' );
	?>
	<div class="wrap">
		<h1 class="wp-heading-inline">Subscritores (<?php echo number_format_i18n( $total ); ?>)</h1>
		<a href="<?php echo esc_url( $export ); ?>" class="page-title-action">Exportar CSV</a>
		<hr class="wp-header-end">

		<?php if ( isset( $_GET['deleted'] ) ) : ?>
			<div class="notice notice-success is-dismissible"><p>Subscritor removido.</p></div>
		<?php endif; ?>

		<table class="widefat striped">
			<thead><tr><th>Nome</th><th>Email</th><th>Página de origem</th><th>Sincronização</th><th>Data</th><th></th></tr></thead>
			<tbody>
			<?php if ( ! $rows ) : ?>
				<tr><td colspan="6">Ainda não há subscritores.</td></tr>
			<?php endif; ?>
			<?php foreach ( $rows as $row ) : ?>
				<tr>
					<td><?php echo esc_html( trim( $row->first_name . ' ' . $row->last_name ) ); ?></td>
					<td><?php echo esc_html( $row->email ); ?></td>
					<td><?php echo $row->source_url ? '<a href="' . esc_url( $row->source_url ) . '" target="_blank" rel="noopener">' . esc_html( wp_parse_url( $row->source_url, PHP_URL_PATH ) ?: '/' ) . '</a>' : '—'; ?></td>
					<td><?php echo 'erro' === $row->sync_status ? '<span style="color:#b32d2e">Erro (ver logs)</span>' : esc_html( ucfirst( $row->sync_status ) ); ?></td>
					<td><?php echo esc_html( mysql2date( 'd/m/Y H:i', $row->created_at ) ); ?></td>
					<td><a class="button-link-delete" href="<?php echo esc_url( wp_nonce_url( admin_url( 'admin-post.php?action=nlfp_delete&id=' . (int) $row->id ), 'nlfp_delete_' . (int) $row->id ) ); ?>" onclick="return confirm('Remover este subscritor?');">Remover</a></td>
				</tr>
			<?php endforeach; ?>
			</tbody>
		</table>

		<?php
		$pages = (int) ceil( $total / $per_page );
		if ( $pages > 1 ) {
			echo '<div class="tablenav"><div class="tablenav-pages">';
			echo paginate_links( array( 'base' => add_query_arg( 'paged', '%#%' ), 'format' => '', 'current' => $paged, 'total' => $pages ) ); // phpcs:ignore WordPress.Security.EscapeOutput
			echo '</div></div>';
		}
		?>
	</div>
	<?php
}

function nlfp_export_csv() {
	if ( ! current_user_can( 'manage_options' ) || ! check_admin_referer( 'nlfp_export' ) ) {
		wp_die( 'Sem permissão.' );
	}
	global $wpdb;
	$rows = $wpdb->get_results( 'SELECT first_name, last_name, email, source_url, sync_status, created_at FROM ' . nlfp_table() . ' ORDER BY created_at DESC', ARRAY_A );

	nocache_headers();
	header( 'Content-Type: text/csv; charset=utf-8' );
	header( 'Content-Disposition: attachment; filename=subscritores-' . gmdate( 'Y-m-d' ) . '.csv' );

	$out = fopen( 'php://output', 'w' );
	fwrite( $out, "\xEF\xBB\xBF" ); // BOM para o Excel abrir os acentos corretamente.
	fputcsv( $out, array( 'Primeiro Nome', 'Apelido', 'Email', 'Página de origem', 'Sincronização', 'Data' ), ';' );
	foreach ( $rows as $row ) {
		// Evita injeção de fórmulas ao abrir no Excel.
		$row = array_map(
			function ( $value ) {
				return preg_match( '/^[=+\-@]/', (string) $value ) ? "'" . $value : $value;
			},
			$row
		);
		fputcsv( $out, $row, ';' );
	}
	fclose( $out );
	exit;
}

function nlfp_delete_subscriber() {
	$id = absint( $_GET['id'] ?? 0 );
	if ( ! current_user_can( 'manage_options' ) || ! check_admin_referer( 'nlfp_delete_' . $id ) ) {
		wp_die( 'Sem permissão.' );
	}
	global $wpdb;
	$wpdb->delete( nlfp_table(), array( 'id' => $id ) );
	wp_safe_redirect( admin_url( 'admin.php?page=nlfp&deleted=1' ) );
	exit;
}
