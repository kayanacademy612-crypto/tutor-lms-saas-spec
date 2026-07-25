<?php
/**
 * Show google meet nav item on the learning area
 *
 * @package Tutor\Templates
 * @subpackage LearningArea
 * @author Themeum <support@themeum.com>
 * @link https://themeum.com
 * @since 4.0.0
 */

defined( 'ABSPATH' ) || exit;

use TUTOR\Icon;
use Tutor\Components\SvgIcon;
use TutorPro\GoogleMeet\Frontend\Frontend;

global $tutor_current_content_id;

$google_meeting = $google_meeting ?? null;
$can_access     = $can_access ?? false;

if ( ! $google_meeting && ! is_a( $google_meeting, 'WP_Post' ) ) {
	return;
}

$is_completed         = tutor_utils()->is_completed_lesson( $google_meeting->ID );
$google_meeting_title = $google_meeting->post_title;
$content_type         = Frontend::get_content_type_info( $google_meeting );

$active_class   = $tutor_current_content_id === $google_meeting->ID ? 'active' : '';
$disabled_class = $can_access ? '' : 'disabled';

$icon_name = Icon::VIDEO_CAMERA_2;
if ( ! $can_access ) {
	$icon_name = Icon::LOCK_STROKE_2;
} elseif ( $is_completed ) {
	$icon_name = Icon::COMPLETED_COLORIZE;
}
?>

<a
	href="<?php echo esc_url( $can_access ? get_permalink( $google_meeting->ID ) : '#' ); ?>" 
	title="<?php echo esc_attr( $google_meeting_title ); ?>"
	class="<?php echo esc_html( sprintf( 'tutor-learning-nav-item %s %s', $active_class, $disabled_class ) ); ?>"
	<?php echo ! $can_access ? 'aria-disabled="true"' : ''; ?>
>
	<?php SvgIcon::make()->name( $icon_name )->size( 20 )->render(); ?>
	<div class="tutor-overflow-hidden">
		<div class="tutor-truncate"><?php echo esc_html( $google_meeting_title ); ?></div>
		<div class="tutor-tiny-2 tutor-text-subdued"><?php echo esc_html( $content_type ); ?></div>
	</div>
</a>
