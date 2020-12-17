/**
 * External dependencies
 */
import { View, Clipboard, TouchableWithoutFeedback, Text } from 'react-native';
import React from 'react';

/**
 * WordPress dependencies
 */
import {
	requestImageFailedRetryDialog,
	requestImageUploadCancelDialog,
	mediaUploadSync,
} from '@wordpress/react-native-bridge';
import {
	BlockIcon,
	MediaPlaceholder,
	MediaUploadProgress,
	RichText,
	PlainText,
	BlockControls,
	MediaUpload,
	InspectorControls,
	MEDIA_TYPE_ANY,
} from '@wordpress/block-editor';
import {
	ToolbarButton,
	ToolbarGroup,
	PanelBody,
	ToggleControl,
	BottomSheet,
	SelectControl,
	Icon,
} from '@wordpress/components';
import {
	file as icon,
	replace,
	button,
	external,
	link,
	warning,
} from '@wordpress/icons';
import { Component } from '@wordpress/element';
import { __, _x } from '@wordpress/i18n';
import { compose, withPreferredColorScheme } from '@wordpress/compose';
import { withDispatch, withSelect } from '@wordpress/data';
import { getProtocol } from '@wordpress/url';

/**
 * Internal dependencies
 */
import styles from './style.scss';

const URL_COPIED_NOTIFICATION_DURATION_MS = 1500;
const MIN_WIDTH = 40;

export class FileEdit extends Component {
	constructor( props ) {
		super( props );

		this.state = {
			isUploadInProgress: false,
			isSidebarLinkSettings: false,
			placeholderTextWidth: 0,
			maxWidth: 0,
		};

		this.timerRef = null;

		this.onLayout = this.onLayout.bind( this );
		this.onSelectFile = this.onSelectFile.bind( this );
		this.onChangeFileName = this.onChangeFileName.bind( this );
		this.onChangeDownloadButtonText = this.onChangeDownloadButtonText.bind(
			this
		);
		this.updateMediaProgress = this.updateMediaProgress.bind( this );
		this.finishMediaUploadWithSuccess = this.finishMediaUploadWithSuccess.bind(
			this
		);
		this.finishMediaUploadWithFailure = this.finishMediaUploadWithFailure.bind(
			this
		);
		this.getFileComponent = this.getFileComponent.bind( this );
		this.onChangeDownloadButtonVisibility = this.onChangeDownloadButtonVisibility.bind(
			this
		);
		this.onCopyURL = this.onCopyURL.bind( this );
		this.onChangeOpenInNewWindow = this.onChangeOpenInNewWindow.bind(
			this
		);

		this.onChangeLinkDestinationOption = this.onChangeLinkDestinationOption.bind(
			this
		);
		this.onShowLinkSettings = this.onShowLinkSettings.bind( this );
		this.onFilePressed = this.onFilePressed.bind( this );
		this.mediaUploadStateReset = this.mediaUploadStateReset.bind( this );
	}

	componentDidMount() {
		const { attributes } = this.props;

		if (
			attributes.id &&
			attributes.url &&
			getProtocol( attributes.url ) === 'file:'
		) {
			mediaUploadSync();
		}
	}

	componentWillUnmount() {
		clearTimeout( this.timerRef );
	}

	componentDidUpdate( prevProps ) {
		if (
			prevProps.isSidebarOpened &&
			! this.props.isSidebarOpened &&
			this.state.isSidebarLinkSettings
		) {
			this.setState( { isSidebarLinkSettings: false } );
		}
	}

	onSelectFile( media ) {
		const { attributes, setAttributes } = this.props;
		const { downloadButtonText } = attributes;
		setAttributes( {
			href: media.url,
			fileName: media.title,
			textLinkHref: media.url,
			id: media.id,
			downloadButtonText:
				downloadButtonText || _x( 'Download', 'button label' ),
		} );
	}

	onChangeFileName( fileName ) {
		this.props.setAttributes( { fileName } );
	}

	onChangeDownloadButtonText( downloadButtonText ) {
		this.props.setAttributes( { downloadButtonText } );
	}

	onChangeDownloadButtonVisibility( showDownloadButton ) {
		this.props.setAttributes( { showDownloadButton } );
	}

	onChangeLinkDestinationOption( newHref ) {
		// Choose Media File or Attachment Page (when file is in Media Library)
		this.props.setAttributes( { textLinkHref: newHref } );
	}

	onCopyURL() {
		if ( this.state.isUrlCopied ) {
			return;
		}
		const { href } = this.props.attributes;
		Clipboard.setString( href );

		this.setState( { isUrlCopied: true } );
		this.timerRef = setTimeout( () => {
			this.setState( { isUrlCopied: false } );
		}, URL_COPIED_NOTIFICATION_DURATION_MS );
	}

	onChangeOpenInNewWindow( newValue ) {
		this.props.setAttributes( {
			textLinkTarget: newValue ? '_blank' : false,
		} );
	}

	updateMediaProgress( payload ) {
		const { setAttributes } = this.props;
		if ( payload.mediaUrl ) {
			setAttributes( { url: payload.mediaUrl } );
		}
		if ( ! this.state.isUploadInProgress ) {
			this.setState( { isUploadInProgress: true } );
		}
	}

	finishMediaUploadWithSuccess( payload ) {
		const { setAttributes } = this.props;

		setAttributes( {
			href: payload.mediaUrl,
			id: payload.mediaServerId,
			textLinkHref: payload.mediaUrl,
		} );
		this.setState( { isUploadInProgress: false } );
	}

	finishMediaUploadWithFailure( payload ) {
		this.props.setAttributes( { id: payload.mediaId } );
		this.setState( { isUploadInProgress: false } );
	}

	mediaUploadStateReset() {
		const { setAttributes } = this.props;

		setAttributes( {
			id: null,
			href: null,
			textLinkHref: null,
			fileName: null,
		} );
		this.setState( { isUploadInProgress: false } );
	}

	onShowLinkSettings() {
		this.setState(
			{
				isSidebarLinkSettings: true,
			},
			this.props.openSidebar
		);
	}

	getToolbarEditButton( open ) {
		return (
			<BlockControls>
				<ToolbarGroup>
					<ToolbarButton
						title={ __( 'Edit file' ) }
						icon={ replace }
						onClick={ open }
					/>
					<ToolbarButton
						title={ __( 'Link To' ) }
						icon={ link }
						onClick={ this.onShowLinkSettings }
					/>
				</ToolbarGroup>
			</BlockControls>
		);
	}

	getInspectorControls(
		{ showDownloadButton, textLinkTarget, href, textLinkHref },
		media,
		isUploadInProgress,
		isUploadFailed
	) {
		let linkDestinationOptions = [ { value: href, label: __( 'URL' ) } ];
		const attachmentPage = media && media.link;
		const { isSidebarLinkSettings } = this.state;

		if ( attachmentPage ) {
			linkDestinationOptions = [
				{ value: href, label: __( 'Media file' ) },
				{ value: attachmentPage, label: __( 'Attachment page' ) },
			];
		}

		const actionButtonStyle = this.props.getStylesFromColorScheme(
			styles.actionButton,
			styles.actionButtonDark
		);

		const isCopyUrlDisabled = isUploadFailed || isUploadInProgress;
		const dimmedStyle = isCopyUrlDisabled && styles.disabledButton;
		const finalButtonStyle = Object.assign(
			{},
			actionButtonStyle,
			dimmedStyle
		);

		return (
			<InspectorControls>
				{ isSidebarLinkSettings || (
					<PanelBody title={ __( 'File block settings' ) } />
				) }
				<PanelBody>
					<SelectControl
						icon={ link }
						label={ __( 'Link to' ) }
						value={ textLinkHref }
						onChange={ this.onChangeLinkDestinationOption }
						options={ linkDestinationOptions }
					/>
					<ToggleControl
						icon={ external }
						label={ __( 'Open in new tab' ) }
						checked={ textLinkTarget === '_blank' }
						onChange={ this.onChangeOpenInNewWindow }
					/>
					{ ! isSidebarLinkSettings && (
						<ToggleControl
							icon={ button }
							label={ __( 'Show download button' ) }
							checked={ showDownloadButton }
							onChange={ this.onChangeDownloadButtonVisibility }
						/>
					) }
					<BottomSheet.Cell
						disabled={ isCopyUrlDisabled }
						label={
							this.state.isUrlCopied
								? __( 'Copied!' )
								: __( 'Copy file URL' )
						}
						labelStyle={
							this.state.isUrlCopied || finalButtonStyle
						}
						onPress={ this.onCopyURL }
					/>
				</PanelBody>
			</InspectorControls>
		);
	}

	getStyleForAlignment( align ) {
		const getFlexAlign = ( alignment ) => {
			switch ( alignment ) {
				case 'right':
					return 'flex-end';
				case 'center':
					return 'center';
				default:
					return 'flex-start';
			}
		};
		return { alignSelf: getFlexAlign( align ) };
	}

	getTextAlignmentForAlignment( align ) {
		switch ( align ) {
			case 'right':
				return 'right';
			case 'center':
				return 'center';
			default:
				return 'left';
		}
	}

	onFilePressed() {
		const { attributes } = this.props;

		if ( this.state.isUploadInProgress ) {
			requestImageUploadCancelDialog( attributes.id );
		} else if (
			attributes.id &&
			getProtocol( attributes.href ) === 'file:'
		) {
			requestImageFailedRetryDialog( attributes.id );
		}
	}

	onLayout( { nativeEvent } ) {
		const { width } = nativeEvent.layout;
		const { paddingLeft, paddingRight } = styles.defaultButton;
		this.setState( {
			maxWidth: width - ( paddingLeft + paddingRight ),
		} );
	}

	// Render `Text` with `placeholderText` styled as a placeholder
	// to calculate its width which then is set as a `minWidth`
	// This should be fixed on RNAztec level. In the mean time,
	// We use the same strategy implemented in Button block
	getPlaceholderWidth( placeholderText ) {
		const { maxWidth, placeholderTextWidth } = this.state;
		return (
			<Text
				style={ styles.placeholder }
				onTextLayout={ ( { nativeEvent } ) => {
					const textWidth =
						nativeEvent.lines[ 0 ] && nativeEvent.lines[ 0 ].width;
					if ( textWidth && textWidth !== placeholderTextWidth ) {
						this.setState( {
							placeholderTextWidth: Math.min(
								textWidth,
								maxWidth
							),
						} );
					}
				} }
			>
				{ placeholderText }
			</Text>
		);
	}

	getFileComponent( openMediaOptions, getMediaOptions ) {
		const { attributes, media, isSelected } = this.props;
		const { isButtonFocused, placeholderTextWidth } = this.state;

		const {
			fileName,
			downloadButtonText,
			id,
			showDownloadButton,
			align,
		} = attributes;

		const minWidth =
			isButtonFocused ||
			( ! isButtonFocused &&
				downloadButtonText &&
				downloadButtonText !== '' )
				? MIN_WIDTH
				: placeholderTextWidth;

		const placeholderText =
			isButtonFocused ||
			( ! isButtonFocused &&
				downloadButtonText &&
				downloadButtonText !== '' )
				? ''
				: __( 'Add text…' );

		return (
			<MediaUploadProgress
				mediaId={ id }
				onUpdateMediaProgress={ this.updateMediaProgress }
				onFinishMediaUploadWithSuccess={
					this.finishMediaUploadWithSuccess
				}
				onFinishMediaUploadWithFailure={
					this.finishMediaUploadWithFailure
				}
				onMediaUploadStateReset={ this.mediaUploadStateReset }
				renderContent={ ( { isUploadInProgress, isUploadFailed } ) => {
					const dimmedStyle =
						( this.state.isUploadInProgress || isUploadFailed ) &&
						styles.disabledButton;
					const finalButtonStyle = [
						styles.defaultButton,
						dimmedStyle,
					];

					const errorIconStyle = Object.assign(
						{},
						styles.errorIcon,
						styles.uploadFailed
					);

					return (
						<TouchableWithoutFeedback
							accessible={ ! isSelected }
							onPress={ this.onFilePressed }
							onLongPress={ openMediaOptions }
							disabled={ ! isSelected }
						>
							<View onLayout={ this.onLayout }>
								{ this.getPlaceholderWidth( placeholderText ) }
								{ isUploadInProgress ||
									this.getToolbarEditButton(
										openMediaOptions
									) }
								{ getMediaOptions() }
								{ this.getInspectorControls(
									attributes,
									media,
									isUploadInProgress,
									isUploadFailed
								) }
								<View style={ styles.container }>
									<RichText
										withoutInteractiveFormatting
										__unstableMobileNoFocusOnMount
										onChange={ this.onChangeFileName }
										placeholder={ __( 'File name' ) }
										rootTagsToEliminate={ [ 'p' ] }
										tagName="p"
										underlineColorAndroid="transparent"
										value={ fileName }
										deleteEnter={ true }
										textAlign={ this.getTextAlignmentForAlignment(
											align
										) }
									/>
									{ isUploadFailed && (
										<View style={ styles.errorContainer }>
											<Icon
												icon={ warning }
												style={ errorIconStyle }
											/>
											<PlainText
												editable={ false }
												value={ __( 'Error' ) }
												style={ styles.uploadFailed }
											/>
										</View>
									) }
								</View>
								{ showDownloadButton &&
									this.state.maxWidth > 0 && (
										<View
											style={ [
												finalButtonStyle,
												this.getStyleForAlignment(
													align
												),
											] }
										>
											<RichText
												withoutInteractiveFormatting
												__unstableMobileNoFocusOnMount
												rootTagsToEliminate={ [ 'p' ] }
												tagName="p"
												textAlign="center"
												minWidth={ minWidth }
												maxWidth={ this.state.maxWidth }
												deleteEnter={ true }
												style={ styles.buttonText }
												value={ downloadButtonText }
												placeholder={ placeholderText }
												unstableOnFocus={ () =>
													this.setState( {
														isButtonFocused: true,
													} )
												}
												onBlur={ () =>
													this.setState( {
														isButtonFocused: false,
													} )
												}
												selectionColor={
													styles.buttonText.color
												}
												placeholderTextColor={
													styles.placeholderTextColor
														.color
												}
												underlineColorAndroid="transparent"
												onChange={
													this
														.onChangeDownloadButtonText
												}
											/>
										</View>
									) }
							</View>
						</TouchableWithoutFeedback>
					);
				} }
			/>
		);
	}

	render() {
		const { attributes } = this.props;
		const { href } = attributes;

		if ( ! href ) {
			return (
				<MediaPlaceholder
					icon={ <BlockIcon icon={ icon } /> }
					labels={ {
						title: __( 'File' ),
						instructions: __( 'CHOOSE A FILE' ),
					} }
					onSelect={ this.onSelectFile }
					onFocus={ this.props.onFocus }
					allowedTypes={ [ MEDIA_TYPE_ANY ] }
				/>
			);
		}

		return (
			<MediaUpload
				allowedTypes={ [ MEDIA_TYPE_ANY ] }
				isReplacingMedia={ true }
				onSelect={ this.onSelectFile }
				render={ ( { open, getMediaOptions } ) => {
					return this.getFileComponent( open, getMediaOptions );
				} }
			/>
		);
	}
}

export default compose( [
	withSelect( ( select, props ) => {
		const { attributes } = props;
		const { id, href } = attributes;
		const { isEditorSidebarOpened } = select( 'core/edit-post' );
		const isNotFileHref = id && getProtocol( href ) !== 'file:';
		return {
			media: isNotFileHref ? select( 'core' ).getMedia( id ) : undefined,
			isSidebarOpened: isEditorSidebarOpened(),
		};
	} ),
	withDispatch( ( dispatch ) => {
		const { openGeneralSidebar } = dispatch( 'core/edit-post' );
		return {
			openSidebar: () => openGeneralSidebar( 'edit-post/block' ),
		};
	} ),
	withPreferredColorScheme,
] )( FileEdit );
