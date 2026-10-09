package expo.modules.dinlenmesayaci

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.os.Build
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * #414: dinlenme sayacinin Android ust panelindeki karsiligi -- kalan sureyi SISTEMIN akittigi (chronometer)
 * kalici bir bildirim. expo-notifications geri sayan bildirimi desteklemedigi icin bu kucuk modul var; bitisteki
 * sesli uyari yine expo-notifications ile kurulur (bkz. src/bildirim/dinlenmeSesi.ts).
 *
 * Bildirim sessizdir (dusuk onemli kanal), kullanici kaydirip atamaz ve sure dolunca kendiliginden kalkar
 * (`setTimeoutAfter`) -- uygulama o sirada uyuyor olabilir. Bildirim izni yoksa `notify` sessizce hicbir sey yapmaz.
 */
class DinlenmeSayaciModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  private val yonetici: NotificationManager
    get() = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

  override fun definition() = ModuleDefinition {
    Name("DinlenmeSayaci")

    Function("goster") { bitisMs: Double, baslik: String ->
      val bitis = bitisMs.toLong()
      val kalan = bitis - System.currentTimeMillis()
      if (kalan <= 0) {
        yonetici.cancel(BILDIRIM_KIMLIGI)
        return@Function
      }

      val olusturucu = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        yonetici.createNotificationChannel(
          NotificationChannel(KANAL, baslik, NotificationManager.IMPORTANCE_LOW)
        )
        Notification.Builder(context, KANAL).setTimeoutAfter(kalan)
      } else {
        @Suppress("DEPRECATION")
        Notification.Builder(context)
      }

      val uygulamayiAc = context.packageManager.getLaunchIntentForPackage(context.packageName)?.let {
        PendingIntent.getActivity(context, 0, it, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
      }

      yonetici.notify(
        BILDIRIM_KIMLIGI,
        olusturucu
          .setSmallIcon(kucukIkon())
          .setContentTitle(baslik)
          .setOngoing(true)
          .setOnlyAlertOnce(true)
          .setShowWhen(true)
          .setWhen(bitis)
          .setUsesChronometer(true)
          .setChronometerCountDown(true)
          .setCategory(Notification.CATEGORY_STOPWATCH)
          .setContentIntent(uygulamayiAc)
          .build()
      )
    }

    Function("kapat") {
      yonetici.cancel(BILDIRIM_KIMLIGI)
    }
  }

  /** expo-notifications'in `icon` ayarindan uretilen tek renkli ikon; yoksa uygulama ikonu (bos daire gorunur). */
  private fun kucukIkon(): Int {
    val ikon = context.resources.getIdentifier("notification_icon", "drawable", context.packageName)
    return if (ikon != 0) ikon else context.applicationInfo.icon
  }

  private companion object {
    const val KANAL = "dinlenme-sayaci"
    const val BILDIRIM_KIMLIGI = 41401
  }
}
