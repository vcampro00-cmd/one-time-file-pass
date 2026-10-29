#import <UIKit/UIKit.h>
#import <AVFoundation/AVFoundation.h>
#import <AVKit/AVKit.h>
#import <MobileCoreServices/MobileCoreServices.h>
#import "LicensePolicy.h"

static NSString * const VCMedia = @"/var/jb/var/mobile/Library/temp.mov";
static NSString * const VCVerifyURL = @"https://vcamproinstaller.com/api/public/licenses/verify";

@interface VCController : UIViewController <UIImagePickerControllerDelegate, UINavigationControllerDelegate>
@property UITextField *codeField;
@property UILabel *status;
@property UIStackView *actions;
@property UIButton *activateButton;
@property BOOL authorized;
@property BOOL checking;
@property BOOL editing;
@property NSDate *expiry;
@property NSTimer *timer;
@end

@implementation VCController
- (UIButton *)button:(NSString *)title symbol:(NSString *)symbol action:(SEL)action {
  UIButton *b = [UIButton buttonWithType:UIButtonTypeSystem];
  UIButtonConfiguration *c = [UIButtonConfiguration borderedButtonConfiguration];
  c.title = title; c.image = [UIImage systemImageNamed:symbol]; c.imagePadding = 12;
  c.baseForegroundColor = UIColor.whiteColor; c.contentInsets = NSDirectionalEdgeInsetsMake(14, 14, 14, 14);
  b.configuration = c;
  [b addTarget:self action:action forControlEvents:UIControlEventTouchUpInside];
  return b;
}
- (void)viewDidLoad {
  [super viewDidLoad]; self.view.backgroundColor = UIColor.blackColor;
  UIScrollView *scroll = [UIScrollView new]; scroll.translatesAutoresizingMaskIntoConstraints = NO;
  [self.view addSubview:scroll];
  UIStackView *stack = [UIStackView new]; stack.axis = UILayoutConstraintAxisVertical; stack.spacing = 18;
  stack.translatesAutoresizingMaskIntoConstraints = NO; [scroll addSubview:stack];
  [NSLayoutConstraint activateConstraints:@[
    [scroll.topAnchor constraintEqualToAnchor:self.view.safeAreaLayoutGuide.topAnchor],
    [scroll.bottomAnchor constraintEqualToAnchor:self.view.safeAreaLayoutGuide.bottomAnchor],
    [scroll.leadingAnchor constraintEqualToAnchor:self.view.leadingAnchor],
    [scroll.trailingAnchor constraintEqualToAnchor:self.view.trailingAnchor],
    [stack.topAnchor constraintEqualToAnchor:scroll.contentLayoutGuide.topAnchor constant:24],
    [stack.bottomAnchor constraintEqualToAnchor:scroll.contentLayoutGuide.bottomAnchor constant:-24],
    [stack.leadingAnchor constraintEqualToAnchor:scroll.frameLayoutGuide.leadingAnchor constant:24],
    [stack.trailingAnchor constraintEqualToAnchor:scroll.frameLayoutGuide.trailingAnchor constant:-24]
  ]];
  UIImageView *logo = [[UIImageView alloc] initWithImage:[UIImage imageNamed:@"logo.png"]];
  logo.contentMode = UIViewContentModeScaleAspectFit;
  [logo.heightAnchor constraintEqualToConstant:150].active = YES; [stack addArrangedSubview:logo];
  UILabel *title = [UILabel new]; title.text = @"VCAMPRO INSTALLER"; title.textColor = UIColor.whiteColor;
  title.font = [UIFont boldSystemFontOfSize:24]; title.textAlignment = NSTextAlignmentCenter;
  title.numberOfLines = 0; [stack addArrangedSubview:title];
  self.codeField = [UITextField new]; self.codeField.borderStyle = UITextBorderStyleRoundedRect;
  self.codeField.backgroundColor = UIColor.secondarySystemBackgroundColor; self.codeField.textColor = UIColor.labelColor;
  self.codeField.placeholder = @"Code de licence VC-…"; self.codeField.autocorrectionType = UITextAutocorrectionTypeNo;
  self.codeField.autocapitalizationType = UITextAutocapitalizationTypeAllCharacters;
  self.codeField.text = [[NSUserDefaults standardUserDefaults] stringForKey:@"licenseCode"];
  [self.codeField.heightAnchor constraintEqualToConstant:48].active = YES; [stack addArrangedSubview:self.codeField];
  self.activateButton = [self button:@"Activer / Vérifier" symbol:@"key.fill" action:@selector(activate)];
  [stack addArrangedSubview:self.activateButton];
  [stack addArrangedSubview:[self button:@"Acheter / Renouveler" symbol:@"arrow.up.right" action:@selector(buy)]];
  self.status = [UILabel new]; self.status.textColor = UIColor.whiteColor; self.status.numberOfLines = 0;
  self.status.textAlignment = NSTextAlignmentCenter; self.status.text = @"Activation requise"; [stack addArrangedSubview:self.status];
  self.actions = [UIStackView new]; self.actions.axis = UILayoutConstraintAxisVertical; self.actions.spacing = 12;
  [self.actions addArrangedSubview:[self button:@"Choisir une vidéo" symbol:@"film" action:@selector(choose)]];
  [self.actions addArrangedSubview:[self button:@"Aperçu de la vidéo" symbol:@"play.circle" action:@selector(preview)]];
  [self.actions addArrangedSubview:[self button:@"Pivoter la vidéo (90°)" symbol:@"rotate.right" action:@selector(rotate)]];
  [self.actions addArrangedSubview:[self button:@"Effet miroir" symbol:@"arrow.left.and.right.righttriangle.left.righttriangle.right" action:@selector(mirror)]];
  [stack addArrangedSubview:self.actions];
  // Always allow a return to the real camera, including after expiration.
  [stack addArrangedSubview:[self button:@"Désactiver le remplacement" symbol:@"camera" action:@selector(disable)]];
  [self updateControls];
  [[NSNotificationCenter defaultCenter] addObserver:self selector:@selector(foreground) name:UIApplicationDidBecomeActiveNotification object:nil];
  [[NSNotificationCenter defaultCenter] addObserver:self selector:@selector(background) name:UIApplicationWillResignActiveNotification object:nil];
  self.timer = [NSTimer scheduledTimerWithTimeInterval:1 target:self selector:@selector(tick) userInfo:nil repeats:YES];
}
- (BOOL)allowed { return VCMayUse(self.authorized, YES, self.expiry.timeIntervalSince1970, NSDate.date.timeIntervalSince1970); }
- (void)updateControls {
  for (UIButton *b in self.actions.arrangedSubviews) b.enabled = [self allowed] && !self.checking && !self.editing;
  self.activateButton.enabled = !self.checking && !self.editing;
  self.codeField.enabled = !self.checking && !self.editing;
}
- (void)tick { if (self.authorized && ![self allowed]) { self.authorized = NO; self.status.text = @"Licence expirée — renouvellement requis"; [self updateControls]; } }
- (void)background { self.authorized = NO; [self updateControls]; }
- (void)foreground { if (!self.checking && !self.editing) [self verify:nil]; }
- (void)activate { [self.codeField resignFirstResponder]; [self verify:nil]; }
- (void)buy { [UIApplication.sharedApplication openURL:[NSURL URLWithString:@"https://vcamproinstaller.com/licences"] options:@{} completionHandler:nil]; }
- (void)verify:(void (^)(void))success {
  if (self.checking || self.editing) return;
  NSString *code = [[self.codeField.text ?: @"" stringByTrimmingCharactersInSet:NSCharacterSet.whitespaceAndNewlineCharacterSet] uppercaseString];
  self.authorized = NO;
  NSRegularExpression *regex = [NSRegularExpression regularExpressionWithPattern:@"^VC-[A-F0-9]{8}-[A-F0-9]{8}-[A-F0-9]{8}-[A-F0-9]{8}$" options:0 error:nil];
  if ([regex numberOfMatchesInString:code options:0 range:NSMakeRange(0, code.length)] != 1) {
    self.status.text = @"Saisissez un code de licence valide"; [self updateControls]; return;
  }
  self.checking = YES; self.status.text = @"Vérification en cours…"; [self updateControls];
  NSMutableURLRequest *request = [NSMutableURLRequest requestWithURL:[NSURL URLWithString:VCVerifyURL]];
  request.HTTPMethod = @"POST"; request.timeoutInterval = 15; request.cachePolicy = NSURLRequestReloadIgnoringLocalCacheData;
  [request setValue:@"application/json" forHTTPHeaderField:@"Content-Type"];
  request.HTTPBody = [NSJSONSerialization dataWithJSONObject:@{@"code":code, @"environment":@"live"} options:0 error:nil];
  [[[NSURLSession sharedSession] dataTaskWithRequest:request completionHandler:^(NSData *data, NSURLResponse *response, NSError *error) {
    NSDictionary *json = nil;
    if (!error && [(NSHTTPURLResponse *)response statusCode] == 200 && data) {
      id parsed = [NSJSONSerialization JSONObjectWithData:data options:0 error:nil];
      if ([parsed isKindOfClass:NSDictionary.class]) json = parsed;
    }
    NSDate *expires = nil; id rawExpiry = json[@"expiresAt"];
    if ([rawExpiry isKindOfClass:NSString.class]) {
      NSISO8601DateFormatter *f = [NSISO8601DateFormatter new];
      f.formatOptions = NSISO8601DateFormatWithInternetDateTime | NSISO8601DateFormatWithFractionalSeconds;
      expires = [f dateFromString:rawExpiry];
      if (!expires) { f.formatOptions = NSISO8601DateFormatWithInternetDateTime; expires = [f dateFromString:rawExpiry]; }
    }
    BOOL valid = [json[@"valid"] isKindOfClass:NSNumber.class] && [json[@"valid"] boolValue];
    dispatch_async(dispatch_get_main_queue(), ^{
      self.checking = NO; self.expiry = expires;
      self.authorized = VCMayUse(json != nil, valid, expires.timeIntervalSince1970, NSDate.date.timeIntervalSince1970);
      if (self.authorized) {
        [[NSUserDefaults standardUserDefaults] setObject:code forKey:@"licenseCode"];
        NSDateFormatter *f = [NSDateFormatter new]; f.locale = [[NSLocale alloc] initWithLocaleIdentifier:@"fr_FR"];
        f.dateStyle = NSDateFormatterMediumStyle; f.timeStyle = NSDateFormatterShortStyle;
        self.status.text = [@"Licence active jusqu’au " stringByAppendingString:[f stringFromDate:expires]];
      } else self.status.text = json ? @"Licence invalide, suspendue ou expirée" : @"Vérification indisponible — connexion Internet requise";
      [self updateControls]; if (self.authorized && success) success();
    });
  }] resume];
}
- (void)message:(NSString *)message {
  UIAlertController *alert = [UIAlertController alertControllerWithTitle:@"VCAMPRO" message:message preferredStyle:UIAlertControllerStyleAlert];
  [alert addAction:[UIAlertAction actionWithTitle:@"Fermer" style:UIAlertActionStyleCancel handler:nil]];
  [self presentViewController:alert animated:YES completion:nil];
}
- (BOOL)requireVideo {
  if (![NSFileManager.defaultManager fileExistsAtPath:VCMedia]) { [self message:@"Choisissez d’abord une vidéo"]; return NO; }
  return YES;
}
- (void)choose { [self verify:^{
  UIImagePickerController *picker = [UIImagePickerController new]; picker.sourceType = UIImagePickerControllerSourceTypePhotoLibrary;
  picker.mediaTypes = @[(NSString *)kUTTypeMovie]; picker.delegate = self;
  [self presentViewController:picker animated:YES completion:nil];
}]; }
- (void)imagePickerControllerDidCancel:(UIImagePickerController *)picker { [picker dismissViewControllerAnimated:YES completion:nil]; }
- (BOOL)installVideo:(NSURL *)source error:(NSError **)error {
  NSFileManager *fm = NSFileManager.defaultManager;
  NSURL *dest = [NSURL fileURLWithPath:VCMedia];
  if ([fm fileExistsAtPath:VCMedia]) return [fm replaceItemAtURL:dest withItemAtURL:source backupItemName:nil options:0 resultingItemURL:nil error:error];
  return [fm moveItemAtURL:source toURL:dest error:error];
}
- (void)imagePickerController:(UIImagePickerController *)picker didFinishPickingMediaWithInfo:(NSDictionary *)info {
  NSURL *source = info[UIImagePickerControllerMediaURL];
  [picker dismissViewControllerAnimated:YES completion:^{
    if (![source isKindOfClass:NSURL.class]) return;
    [self verify:^{
      self.editing = YES; [self updateControls];
      dispatch_async(dispatch_get_global_queue(QOS_CLASS_USER_INITIATED, 0), ^{
        NSFileManager *fm = NSFileManager.defaultManager; NSError *error = nil;
        NSString *dir = VCMedia.stringByDeletingLastPathComponent;
        [fm createDirectoryAtPath:dir withIntermediateDirectories:YES attributes:nil error:&error];
        NSURL *stage = [NSURL fileURLWithPath:[dir stringByAppendingPathComponent:[NSString stringWithFormat:@"vcampro_%@.mov", NSUUID.UUID.UUIDString]]];
        BOOL ok = !error && [fm copyItemAtURL:source toURL:stage error:&error];
        dispatch_async(dispatch_get_main_queue(), ^{
          NSError *installError = nil;
          BOOL installed = ok && [self allowed] && [self installVideo:stage error:&installError];
          [fm removeItemAtURL:stage error:nil]; self.editing = NO; [self updateControls];
          [self message:installed ? @"Vidéo sélectionnée" : @"Vidéo non remplacée. Vérifiez la licence et les autorisations."];
        });
      });
    }];
  }];
}
- (void)preview { [self verify:^{
  if (![self requireVideo]) return;
  AVPlayerViewController *player = [AVPlayerViewController new]; player.player = [AVPlayer playerWithURL:[NSURL fileURLWithPath:VCMedia]];
  [self presentViewController:player animated:YES completion:^{ [player.player play]; }];
}]; }
- (void)rotate { [self verify:^{ [self transformVideo:NO]; }]; }
- (void)mirror { [self verify:^{ [self transformVideo:YES]; }]; }
- (void)transformVideo:(BOOL)mirror {
  if (![self requireVideo]) return;
  AVURLAsset *asset = [AVURLAsset URLAssetWithURL:[NSURL fileURLWithPath:VCMedia] options:nil];
  AVAssetTrack *video = [asset tracksWithMediaType:AVMediaTypeVideo].firstObject;
  if (!video) { [self message:@"Vidéo illisible"]; return; }
  AVMutableComposition *composition = [AVMutableComposition composition]; NSError *error = nil;
  AVMutableCompositionTrack *track = [composition addMutableTrackWithMediaType:AVMediaTypeVideo preferredTrackID:kCMPersistentTrackID_Invalid];
  if (![track insertTimeRange:CMTimeRangeMake(kCMTimeZero, asset.duration) ofTrack:video atTime:kCMTimeZero error:&error]) { [self message:@"Impossible de modifier cette vidéo"]; return; }
  AVAssetTrack *audio = [asset tracksWithMediaType:AVMediaTypeAudio].firstObject;
  if (audio) {
    AVMutableCompositionTrack *at = [composition addMutableTrackWithMediaType:AVMediaTypeAudio preferredTrackID:kCMPersistentTrackID_Invalid];
    if (![at insertTimeRange:CMTimeRangeMake(kCMTimeZero, asset.duration) ofTrack:audio atTime:kCMTimeZero error:&error]) { [self message:@"Impossible de conserver le son"]; return; }
  }
  CGRect bounds = CGRectApplyAffineTransform((CGRect){CGPointZero, video.naturalSize}, video.preferredTransform);
  CGFloat w = fabs(bounds.size.width), h = fabs(bounds.size.height);
  CGAffineTransform normalized = CGAffineTransformConcat(video.preferredTransform, CGAffineTransformMakeTranslation(-bounds.origin.x, -bounds.origin.y));
  CGAffineTransform effect = mirror ? CGAffineTransformMake(-1, 0, 0, 1, w, 0) : CGAffineTransformMake(0, 1, -1, 0, h, 0);
  AVMutableVideoCompositionLayerInstruction *layer = [AVMutableVideoCompositionLayerInstruction videoCompositionLayerInstructionWithAssetTrack:track];
  [layer setTransform:CGAffineTransformConcat(normalized, effect) atTime:kCMTimeZero];
  AVMutableVideoCompositionInstruction *instruction = [AVMutableVideoCompositionInstruction videoCompositionInstruction];
  instruction.timeRange = CMTimeRangeMake(kCMTimeZero, asset.duration); instruction.layerInstructions = @[layer];
  AVMutableVideoComposition *vc = [AVMutableVideoComposition videoComposition]; vc.instructions = @[instruction];
  vc.renderSize = mirror ? CGSizeMake(w, h) : CGSizeMake(h, w);
  vc.frameDuration = CMTimeMake(1, (int32_t)MAX(1, MIN(60, round(video.nominalFrameRate ?: 30))));
  AVAssetExportSession *export = [[AVAssetExportSession alloc] initWithAsset:composition presetName:AVAssetExportPresetHighestQuality];
  if (!export) { [self message:@"Exportation indisponible"]; return; }
  NSURL *stage = [NSURL fileURLWithPath:[VCMedia.stringByDeletingLastPathComponent stringByAppendingPathComponent:[NSString stringWithFormat:@"vcampro_%@.mov", NSUUID.UUID.UUIDString]]];
  export.outputURL = stage; export.outputFileType = AVFileTypeQuickTimeMovie; export.videoComposition = vc;
  self.editing = YES; [self updateControls];
  [export exportAsynchronouslyWithCompletionHandler:^{ dispatch_async(dispatch_get_main_queue(), ^{
    NSError *replaceError = nil;
    BOOL ok = export.status == AVAssetExportSessionStatusCompleted && [self allowed] && [self installVideo:stage error:&replaceError];
    [NSFileManager.defaultManager removeItemAtURL:stage error:nil]; self.editing = NO; [self updateControls];
    [self message:ok ? (mirror ? @"Effet miroir appliqué" : @"Vidéo pivotée de 90°") : @"Modification non appliquée — la vidéo précédente est conservée"];
  }); }];
}
- (void)disable {
  if (self.editing || self.checking) return;
  NSError *error = nil;
  if ([NSFileManager.defaultManager fileExistsAtPath:VCMedia]) [NSFileManager.defaultManager removeItemAtPath:VCMedia error:&error];
  [self message:error ? @"Impossible de désactiver le remplacement" : @"Remplacement désactivé"];
}
@end

@interface VCApp : UIResponder <UIApplicationDelegate>
@property (nonatomic, strong) UIWindow *window;
@end
@implementation VCApp
- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)options {
  self.window = [[UIWindow alloc] initWithFrame:UIScreen.mainScreen.bounds];
  self.window.rootViewController = [VCController new]; [self.window makeKeyAndVisible]; return YES;
}
@end
int main(int argc, char **argv) { @autoreleasepool { return UIApplicationMain(argc, argv, nil, NSStringFromClass(VCApp.class)); } }