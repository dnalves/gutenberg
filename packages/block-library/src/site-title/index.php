<?php
/**
 * Server-side rendering of the `core/site-title` block.
 *
 * @package WordPress
 */

/**
 * Renders the `core/site-title` block on the server.
 *
 * @param array $attributes The block attributes.
 *
 * @return string The render.
 */
function render_block_core_site_title( $attributes ) {
	$site_title = get_bloginfo( 'name' );
	if ( ! $site_title ) {
		return;
	}

	$tag_name         = 'h1';
	$align_class_name = empty( $attributes['textAlign'] ) ? '' : "has-text-align-{$attributes['textAlign']}";

	if ( isset( $attributes['level'] ) ) {
		$tag_name = 0 === $attributes['level'] ? 'p' : 'h' . $attributes['level'];
	}

	if ( $attributes['isLink'] ) {
		$link_attrs = array(
			'href="' . get_bloginfo( 'url' ) . '"',
			'rel="home"',
		);
		if ( '_blank' === $attributes['linkTarget'] ) {
			$link_attrs[] = 'target="_blank"';
			$link_attrs[] = 'aria-label="' . esc_attr__( '(opens in a new tab)' ) . '"';
		}
		$site_title = sprintf( '<a %1$s>%2$s</a>', implode( ' ', $link_attrs ), $site_title );
	}
	$wrapper_attributes = get_block_wrapper_attributes( array( 'class' => $align_class_name ) );

	return sprintf(
		'<%1$s %2$s>%3$s</%1$s>',
		$tag_name,
		$wrapper_attributes,
		$site_title
	);
}

/**
 * Registers the `core/site-title` block on the server.
 */
function register_block_core_site_title() {
	register_block_type_from_metadata(
		__DIR__ . '/site-title',
		array(
			'render_callback' => 'render_block_core_site_title',
		)
	);
}
add_action( 'init', 'register_block_core_site_title' );
