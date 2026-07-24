<?php
/**
 * Show zoom nav item on the learning area
 *
 * @package Tutor\Templates
 * @subpackage LearningArea
 * @author Themeum <support@themeum.com>
 * @link https://themeum.com
 * @since 4.0.0
 */

defined( 'ABSPATH' ) || exit;

use TUTOR\Icon;
use TUTOR_ZOOM\Zoom;
use Tutor\Components\SvgIcon;

global $tutor_current_content_id;

$zoom_meeting = $zoom_meeting ?? null;
$can_access   = $can_access ?? false;

if ( ! $zoom_meeting && ! is_a( $zoom_meeting, 'WP_Post' ) ) {
	return;
}

$is_completed       = tutor_utils()->is_completed_lesson( $zoom_meeting->ID );
$zoom_meeting_title = $zoom_meeting->post_title;
$content_type       = Zoom::get_content_type_info( $zoom_meeting );

$active_class   = $tutor_current_content_id === $zoom_meeting->ID ? 'active' : '';
$disabled_class = $can_access ? '' : 'disabled';

$icon_name = Icon::VIDEO_CAMERA_2;
if ( ! $can_access ) {
	$icon_name = Icon::LOCK_STROKE_2;
} elseif ( $is_completed ) {
	$icon_name = Icon::COMPLETED_COLORIZE;
}
?>

<a
	href="<?php echo esc_url( $can_access ? get_permalink( $zoom_meeting->ID ) : '#' ); ?>" 
	title="<?php echo esc_attr( $zoom_meeting_title ); ?>"
	class="<?php echo esc_html( sprintf( 'tutor-learning-nav-item %s %s', $active_class, $disabled_class ) ); ?>"
	<?php echo ! $can_access ? 'aria-disabled="true"' : ''; ?>
>
	<?php 	SvgIcon::make()->name( $icon_name )->size( 20 )->render(); ?>
	<div class="tutor-overflow-hidden">
		<div class="tutor-truncate"><?php echo esc_html( $zoom_meeting_title ); ?></div>
		<div class="tutor-tiny-2 tutor-text-subdued"><?php echo esc_html( $content_type ); ?></div>
	</div>
</a>
